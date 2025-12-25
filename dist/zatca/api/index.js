"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const signing_1 = require("../signing");
const parser_1 = require("../../parser");
const settings = {
    API_VERSION: "V2",
    SANDBOX_BASEURL: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
    //SANDBOX_BASEURL: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
    // SANDBOX_BASEURL: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
};
class API {
    constructor() {
        this.getAuthHeaders = (certificate, secret) => {
            if (certificate && secret) {
                const certificate_stripped = (0, signing_1.cleanUpCertificateString)(certificate);
                const basic = Buffer.from(`${Buffer.from(certificate_stripped).toString("base64")}:${secret}`).toString("base64");
                return {
                    Authorization: `Basic ${basic}`,
                };
            }
            return {};
        };
    }
    compliance(certificate, secret) {
        const auth_headers = this.getAuthHeaders(certificate, secret);
        const issueCertificate = (csr, otp) => __awaiter(this, void 0, void 0, function* () {
            const headers = {
                "Accept-Version": settings.API_VERSION,
                OTP: otp,
            };
            const response = yield axios_1.default.post(`${settings.SANDBOX_BASEURL}/compliance`, { csr: Buffer.from(csr).toString("base64") }, { headers: Object.assign(Object.assign({}, auth_headers), headers) });
            if (response.status != 200)
                throw new Error("Error issuing a compliance certificate.");
            //ahmed
            let issued_certificate = response.data.binarySecurityToken;
            //issued_certificate = `-----BEGIN CERTIFICATE-----\n${issued_certificate}\n-----END CERTIFICATE-----`;
            const api_secret = response.data.secret;
            return { issued_certificate, api_secret, request_id: response.data.requestID };
        });
        const checkInvoiceCompliance = (signed_xml_string, invoice_hash, egs_uuid) => __awaiter(this, void 0, void 0, function* () {
            const headers = {
                "Accept-Version": settings.API_VERSION,
                "Accept-Language": "en",
            };
            const response = yield axios_1.default.post(`${settings.SANDBOX_BASEURL}/compliance/invoices`, {
                invoiceHash: invoice_hash,
                uuid: egs_uuid,
                invoice: Buffer.from(signed_xml_string).toString("base64"),
            }, { headers: Object.assign(Object.assign({}, auth_headers), headers) });
            //console.log(util.inspect(response.data.validationResults, { showHidden: false, depth: null, colors: true }));
            //  if (response.status != 200) throw new Error("Error in compliance check.");
            return response.data;
        });
        return { issueCertificate, checkInvoiceCompliance };
    }
    production(certificate, secret) {
        const auth_headers = this.getAuthHeaders(certificate, secret);
        // console.log(auth_headers1);
        const basic = Buffer.from(`${certificate}:${secret}`).toString("base64");
        //for onbarding
        const auth_headers1 = {
            Authorization: `Basic ${basic}`,
        };
        //   console.log(auth_headers);
        const issueCertificate = (compliance_request_id) => __awaiter(this, void 0, void 0, function* () {
            const headers = {
                "Accept-Version": settings.API_VERSION,
            };
            const response = yield axios_1.default.post(`${settings.SANDBOX_BASEURL}/production/csids`, { compliance_request_id: compliance_request_id }, { headers: Object.assign(Object.assign({}, auth_headers1), headers) });
            //console.log(response.data);
            return response.data; /*
            if (response.status != 200) throw new Error("Error issuing a production certificate.");
      
            let issued_certificate = response.data.binarySecurityToken;
            //  issued_certificate = `-----BEGIN CERTIFICATE-----\n${issued_certificate}\n-----END CERTIFICATE-----`;
            const api_secret = response.data.secret;
      
            return { issued_certificate, api_secret, request_id: response.data.requestID };*/
        });
        const reportInvoice = (signed_xml_string, invoice_hash, egs_uuid) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const headers = {
                "Accept-Version": settings.API_VERSION,
                "Accept-Language": "en",
                "Clearance-Status": "1",
            };
            const invoice_copy = new parser_1.XMLDocument(signed_xml_string);
            const invoiceType = (_a = invoice_copy.get("Invoice/cbc:InvoiceTypeCode")) === null || _a === void 0 ? void 0 : _a[0]["@_name"].toString();
            let url = "";
            if (invoiceType == "0200000") {
                url = "/invoices/reporting/single";
            }
            else {
                url = "/invoices/clearance/single";
            }
            // console.log(auth_headers);
            const response = yield axios_1.default.post(`${settings.SANDBOX_BASEURL}${url}`, {
                invoiceHash: invoice_hash,
                uuid: egs_uuid,
                invoice: Buffer.from(signed_xml_string).toString("base64"),
            }, { headers: Object.assign(Object.assign({}, auth_headers), headers) });
            //  console.log(util.inspect(response.data.validationResults, { showHidden: false, depth: null, colors: true }));
            //   if (response.status != 200) throw new Error("Error in reporting invoice.");
            //  console.log(response.data.validationResults);
            return response.data;
        });
        return {
            issueCertificate,
            reportInvoice,
        };
    }
}
exports.default = API;
