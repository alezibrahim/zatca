"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSignedXMLString = exports.cleanUpPrivateKeyString = exports.cleanUpCertificateString = exports.getCertificateInfo = exports.createInvoiceDigitalSignature = exports.getCertificateHash = exports.getInvoiceHash = exports.getPureInvoiceString = void 0;
const xmldsigjs_1 = require("xmldsigjs");
const xmldom_1 = __importDefault(require("xmldom"));
const crypto_1 = require("crypto");
const moment_1 = __importDefault(require("moment"));
const x509_1 = require("@fidm/x509");
const parser_1 = require("../../parser");
const qr_1 = require("../qr");
const ubl_sign_extension_template_1 = __importDefault(require("../templates/ubl_sign_extension_template"));
const ubl_extension_signed_properties_template_1 = __importStar(require("../templates/ubl_extension_signed_properties_template"));
const logger_1 = require("../../logger");
/**
 * Removes (UBLExtensions (Signing), Signature Envelope, and QR data) Elements. Then canonicalizes the XML to c14n.
 * In Order to prep for hashing.
 * @param invoice_xml XMLDocument.
 * @returns purified Invoice XML string.
 */
const getPureInvoiceString = (invoice_xml) => {
    const invoice_copy = new parser_1.XMLDocument(invoice_xml.toString({ no_header: false }));
    invoice_copy.delete("Invoice/ext:UBLExtensions");
    invoice_copy.delete("Invoice/cac:Signature");
    invoice_copy.delete("Invoice/cac:AdditionalDocumentReference", { "cbc:ID": "QR" });
    const invoice_xml_dom = new xmldom_1.default.DOMParser().parseFromString(invoice_copy.toString({ no_header: false }));
    var canonicalizer = new xmldsigjs_1.XmlCanonicalizer(false, false);
    const canonicalized_xml_str = canonicalizer.Canonicalize(invoice_xml_dom);
    return canonicalized_xml_str;
};
exports.getPureInvoiceString = getPureInvoiceString;
/**
 * Hashes Invoice according to ZATCA.
 * https://zatca.gov.sa/ar/E-Invoicing/SystemsDevelopers/Documents/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
 * 2.3.3: Follows same method as PIH (Previous invoice hash BS: KSA-13).
 * @param invoice_xml XMLDocument.
 * @returns String invoice hash encoded in base64.
 */
const getInvoiceHash = (invoice_xml) => {
    let pure_invoice_string = (0, exports.getPureInvoiceString)(invoice_xml);
    // A dumb workaround for whatever reason ZATCA XML devs decided to include those trailing spaces and a newlines. (without it the hash is incorrect)
    pure_invoice_string = pure_invoice_string.replace("<cbc:ProfileID>", "\n    <cbc:ProfileID>");
    pure_invoice_string = pure_invoice_string.replace("<cac:AccountingSupplierParty>", "\n    \n    <cac:AccountingSupplierParty>");
    return (0, crypto_1.createHash)("sha256").update(pure_invoice_string).digest("base64");
};
exports.getInvoiceHash = getInvoiceHash;
/**
 * Hashes Certificate according to ZATCA.
 * https://zatca.gov.sa/ar/E-Invoicing/SystemsDevelopers/Documents/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
 * 1.6.2.1.1.2: used in reference to digital signing certificate.
 * @param certificate_string String base64 encoded certificate body.
 * @returns String certificate hash encoded in base64.
 */
const getCertificateHash = (certificate_string) => {
    const certificate_hash = Buffer.from((0, crypto_1.createHash)("sha256").update(certificate_string).digest("hex")).toString("base64");
    return certificate_hash;
};
exports.getCertificateHash = getCertificateHash;
/**
 * Creates invoice digital signature according to ZATCA.
 * https://zatca.gov.sa/ar/E-Invoicing/SystemsDevelopers/Documents/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
 * 1.4: Digital signature, part of the cryptographic stamp (invoice hash signed using private key) (BS: KSA-15).
 * @param invoice_hash String base64 encoded invoice hash.
 * @param private_key_string String base64 encoded ec-secp256k1 private key body.
 * @returns String base64 encoded digital signature.
 */
const createInvoiceDigitalSignature = (invoice_hash, private_key_string) => {
    const invoice_hash_bytes = Buffer.from(invoice_hash, "base64");
    const cleanedup_private_key_string = (0, exports.cleanUpPrivateKeyString)(private_key_string);
    //ahmed for linux , mac os use this -----BEGIN EC PRIVATE KEY-----\n${cleanedup_private_key_string}\n-----END EC PRIVATE KEY-----`;
    const wrapped_private_key_string = `-----BEGIN EC PRIVATE KEY-----\n${cleanedup_private_key_string}\n-----END EC PRIVATE KEY-----`;
    //console.log(wrapped_private_key_string);
    var sign = (0, crypto_1.createSign)("sha256");
    sign.update(invoice_hash_bytes);
    //ahmed
    var signature = Buffer.from(sign.sign(wrapped_private_key_string)).toString("base64");
    //var signature = new Buffer(sign.sign(wrapped_private_key_string).toString("base64"), "base64").toString();
    return signature;
};
exports.createInvoiceDigitalSignature = createInvoiceDigitalSignature;
/**
 * Gets certificate hash, x509IssuerName, and X509SerialNumber and formats them according to ZATCA.
 * @param certificate_string String base64 encoded certificate body.
 * @returns {hash: string, issuer: string, serial_number: string, public_key: Buffer, signature: Buffer}.
 */
const getCertificateInfo = (certificate_string) => {
    const cleanedup_certificate_string = (0, exports.cleanUpCertificateString)(certificate_string);
    const wrapped_certificate_string = `-----BEGIN CERTIFICATE-----\n${cleanedup_certificate_string}\n-----END CERTIFICATE-----`;
    //console.log(wrapped_certificate_string);
    const hash = (0, exports.getCertificateHash)(cleanedup_certificate_string);
    const x509 = new crypto_1.X509Certificate(wrapped_certificate_string);
    //console.log(x509);
    // Signature, and public key extraction from x509 PEM certificate (asn1 rfc5280)
    // Crypto module does not have those functionalities so i'm the crypto boy now :(
    // https://github.com/nodejs/node/blob/main/src/crypto/crypto_x509.cc
    // https://linuxctl.com/2017/02/x509-certificate-manual-signature-verification/
    // https://github.com/junkurihara/js-x509-utils/blob/develop/src/x509.js
    // decode binary x509-formatted object
    const cert = x509_1.Certificate.fromPEM(Buffer.from(wrapped_certificate_string));
    //console.log(x509.issuer.split("\n").reverse().join(", "));
    //console.log(BigInt(`0x${x509.serialNumber}`).toString(10));
    return {
        hash: hash,
        issuer: x509.issuer.split("\n").reverse().join(", "),
        serial_number: BigInt(`0x${x509.serialNumber}`).toString(10),
        public_key: cert.publicKeyRaw,
        signature: cert.signature,
    };
};
exports.getCertificateInfo = getCertificateInfo;
/**
 * Removes header and footer from certificate string.
 * @param certificate_string.
 * @returns String base64 encoded certificate body.
 */
const cleanUpCertificateString = (certificate_string) => {
    return certificate_string
        .replace(`-----BEGIN CERTIFICATE-----\n`, "")
        .replace("-----END CERTIFICATE-----", "")
        .trim();
};
exports.cleanUpCertificateString = cleanUpCertificateString;
/**
 * Removes header and footer from private key string.
 * @param privatek_key_string ec-secp256k1 private key string.
 * @returns String base64 encoded private key body.
 */
const cleanUpPrivateKeyString = (certificate_string) => {
    return certificate_string
        .replace(`-----BEGIN EC PRIVATE KEY-----\n`, "")
        .replace("-----END EC PRIVATE KEY-----", "")
        .trim();
};
exports.cleanUpPrivateKeyString = cleanUpPrivateKeyString;
/**
 * Main signing function.
 * @param invoice_xml XMLDocument of invoice to be signed.
 * @param certificate_string String signed EC certificate.
 * @param private_key_string String ec-secp256k1 private key;
 * @returns signed_invoice_string: string, invoice_hash: string, qr: string
 */
const generateSignedXMLString = ({ invoice_xml, certificate_string, private_key_string, }) => {
    const invoice_copy = new parser_1.XMLDocument(invoice_xml.toString({ no_header: false }));
    //console.log(invoice_xml.toString({ no_header: false }));
    // 1: Invoice Hash
    const invoice_hash = (0, exports.getInvoiceHash)(invoice_xml);
    (0, logger_1.log)("Info", "Signer", `Invoice hash:  ${invoice_hash}`);
    // 2: Certificate hash and certificate info
    const cert_info = (0, exports.getCertificateInfo)(certificate_string);
    (0, logger_1.log)("Info", "Signer", `Certificate info:  ${JSON.stringify(cert_info)}`);
    // 3: Digital Certificate
    const digital_signature = (0, exports.createInvoiceDigitalSignature)(invoice_hash, private_key_string);
    (0, logger_1.log)("Info", "Signer", `Digital signature: ${digital_signature}`);
    // 4: QR
    const qr = (0, qr_1.generateQR)({
        invoice_xml: invoice_xml,
        digital_signature: digital_signature,
        public_key: cert_info.public_key,
        certificate_signature: cert_info.signature,
    });
    (0, logger_1.log)("Info", "Signer", `QR: ${qr}`);
    // Set Signed properties
    const signed_properties_props = {
        sign_timestamp: (0, moment_1.default)(new Date()).format("YYYY-MM-DDTHH:mm:ss") + "Z",
        certificate_hash: cert_info.hash,
        certificate_issuer: cert_info.issuer,
        certificate_serial_number: cert_info.serial_number,
    };
    const ubl_signature_signed_properties_xml_string_for_signing = (0, ubl_extension_signed_properties_template_1.defaultUBLExtensionsSignedPropertiesForSigning)(signed_properties_props);
    const ubl_signature_signed_properties_xml_string = (0, ubl_extension_signed_properties_template_1.default)(signed_properties_props);
    // 5: Get SignedProperties hash
    const signed_properties_bytes = Buffer.from(ubl_signature_signed_properties_xml_string_for_signing);
    let signed_properties_hash = (0, crypto_1.createHash)("sha256").update(signed_properties_bytes).digest("hex");
    signed_properties_hash = Buffer.from(signed_properties_hash).toString("base64");
    (0, logger_1.log)("Info", "Signer", `Signed properites hash: ${signed_properties_hash}`);
    // UBL Extensions
    let ubl_signature_xml_string = (0, ubl_sign_extension_template_1.default)(invoice_hash, signed_properties_hash, digital_signature, (0, exports.cleanUpCertificateString)(certificate_string), ubl_signature_signed_properties_xml_string);
    // Set signing elements
    let unsigned_invoice_str = invoice_copy.toString({ no_header: false });
    unsigned_invoice_str = unsigned_invoice_str.replace("SET_UBL_EXTENSIONS_STRING", ubl_signature_xml_string);
    unsigned_invoice_str = unsigned_invoice_str.replace("SET_QR_CODE_DATA", qr);
    const signed_invoice = new parser_1.XMLDocument(unsigned_invoice_str);
    let signed_invoice_string = signed_invoice.toString({ no_header: false });
    signed_invoice_string = signedPropertiesIndentationFix(signed_invoice_string);
    //display xml ahmed
    //console.log(signed_invoice.toString({ no_header: false }));
    return { signed_invoice_string: signed_invoice_string, invoice_hash: invoice_hash, qr };
};
exports.generateSignedXMLString = generateSignedXMLString;
/**
 * This hurts to do :'(. I hope that it's only temporary and ZATCA decides to just minify the XML before doing any hashing on it.
 * there is no logical reason why the validation expects an incorrectly indented XML.
 * Anyway, this is a function that fucks up the indentation in order to match validator hashing.
 */
const signedPropertiesIndentationFix = (signed_invoice_string) => {
    let fixer = signed_invoice_string;
    let signed_props_lines = fixer.split("<ds:Object>")[1].split("</ds:Object>")[0].split("\n");
    let fixed_lines = [];
    // Stripping first 4 spaces
    signed_props_lines.map((line) => fixed_lines.push(line.slice(4, line.length)));
    signed_props_lines = signed_props_lines.slice(0, signed_props_lines.length - 1);
    fixed_lines = fixed_lines.slice(0, fixed_lines.length - 1);
    fixer = fixer.replace(signed_props_lines.join("\n"), fixed_lines.join("\n"));
    return fixer;
};
