"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePhaseOneQR = exports.generateQR = void 0;
const moment_1 = __importDefault(require("moment"));
const signing_1 = require("../signing");
/**
 * Generates QR for a given invoice. According to ZATCA BR-KSA-27
 * @param invoice_xml XMLDocument.
 * @param digital_signature String base64 encoded digital signature.
 * @param public_key Buffer certificate public key.
 * @param certificate_signature Buffer certificate signature.
 * @returns String base64 encoded QR data.
 */
const generateQR = ({ invoice_xml, digital_signature, public_key, certificate_signature }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    // Hash
    const invoice_hash = (0, signing_1.getInvoiceHash)(invoice_xml);
    // Extract required tags
    const seller_name = (_a = invoice_xml.get("Invoice/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName")) === null || _a === void 0 ? void 0 : _a[0];
    const VAT_number = (_b = invoice_xml
        .get("Invoice/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID")) === null || _b === void 0 ? void 0 : _b[0].toString();
    const invoice_total = (_c = invoice_xml
        .get("Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount")) === null || _c === void 0 ? void 0 : _c[0]["#text"].toString();
    const VAT_total = (_d = invoice_xml.get("Invoice/cac:TaxTotal")) === null || _d === void 0 ? void 0 : _d[0]["cbc:TaxAmount"]["#text"].toString();
    const issue_date = (_e = invoice_xml.get("Invoice/cbc:IssueDate")) === null || _e === void 0 ? void 0 : _e[0];
    const issue_time = (_f = invoice_xml.get("Invoice/cbc:IssueTime")) === null || _f === void 0 ? void 0 : _f[0];
    const datetime = `${issue_date} ${issue_time}`;
    const formatted_datetime = (0, moment_1.default)(datetime).format("YYYY-MM-DDTHH:mm:ss");
    //console.log(formatted_datetime);
    // Detect if simplified invoice or not (not used currently assuming all simplified tax invoice)
    const invoice_type = (_g = invoice_xml.get("Invoice/cbc:InvoiceTypeCode")) === null || _g === void 0 ? void 0 : _g[0]["@_name"].toString();
    // inovice number
    const invoice_no = (_h = invoice_xml.get("Invoice/cac:AdditionalDocumentReference")) === null || _h === void 0 ? void 0 : _h[0]["cbc:UUID"];
    // console.log(invoice_no);
    //ahmed change
    const qr_tlv = TLV([
        seller_name,
        VAT_number,
        formatted_datetime,
        invoice_total,
        VAT_total,
        invoice_hash,
        Buffer.from(digital_signature),
        public_key,
        certificate_signature,
    ]);
    //console.log(qr_tlv.toString("base64"));
    // const base64ToUint8 = (str: string): Uint8Array => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
    // console.log(base64ToUint8(qr_tlv.toString("base64")));
    // const uint8ToBase64 = (arr: Uint8Array): string => Buffer.from(arr).toString("base64");
    // console.log(uint8ToBase64(base64ToUint8(qr_tlv.toString("base64"))));
    return qr_tlv.toString("base64");
    // return tagsToBase64(tags);
};
exports.generateQR = generateQR;
/**
 * Generates a QR for phase one given an invoice.
 * This is a temporary function for backwards compatibility while phase two is not fully deployed.
 * @param invoice_xml XMLDocument.
 * @returns String base64 encoded QR data.
 */
const generatePhaseOneQR = ({ invoice_xml }) => {
    var _a, _b, _c, _d, _e, _f;
    // Extract required tags
    const seller_name = (_a = invoice_xml.get("Invoice/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName")) === null || _a === void 0 ? void 0 : _a[0];
    const VAT_number = (_b = invoice_xml
        .get("Invoice/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID")) === null || _b === void 0 ? void 0 : _b[0].toString();
    const invoice_total = (_c = invoice_xml
        .get("Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount")) === null || _c === void 0 ? void 0 : _c[0]["#text"].toString();
    const VAT_total = (_d = invoice_xml.get("Invoice/cac:TaxTotal")) === null || _d === void 0 ? void 0 : _d[0]["cbc:TaxAmount"]["#text"].toString();
    const issue_date = (_e = invoice_xml.get("Invoice/cbc:IssueDate")) === null || _e === void 0 ? void 0 : _e[0];
    const issue_time = (_f = invoice_xml.get("Invoice/cbc:IssueTime")) === null || _f === void 0 ? void 0 : _f[0];
    const datetime = `${issue_date} ${issue_time}`;
    const formatted_datetime = (0, moment_1.default)(datetime).format("YYYY-MM-DDTHH:mm:ss") + "Z";
    const qr_tlv = TLV([seller_name, VAT_number, formatted_datetime, invoice_total, VAT_total]);
    return qr_tlv.toString("base64");
};
exports.generatePhaseOneQR = generatePhaseOneQR;
const TLV = (tags) => {
    const tlv_tags = [];
    tags.forEach((tag, i) => {
        const tagValueBuffer = Buffer.from(tag);
        const current_tlv_value = Buffer.from([i + 1, tagValueBuffer.byteLength, ...tagValueBuffer]);
        tlv_tags.push(current_tlv_value);
    });
    return Buffer.concat(tlv_tags);
};
