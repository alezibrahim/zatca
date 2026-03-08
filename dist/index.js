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
exports.renderQR = void 0;
const express_1 = __importDefault(require("express"));
const index_1 = require("./zatca/egs/index");
//import { ZATCASimplifiedInvoiceLineItem } from "./zatca/templates/simplified_tax_invoice_template";
const ZATCASimplifiedTaxInvoice_1 = require("./zatca/ZATCASimplifiedTaxInvoice");
const simplified_tax_invoice_template_1 = require("./zatca/templates/simplified_tax_invoice_template");
//import util from "util";
const cors_1 = __importDefault(require("cors"));
//import QRCode from "qrcode";
//import path from "path";
//import dotenv from "dotenv";
//dotenv.config();
const qrcode_1 = require("qrcode");
const port = 5001;
const app = (0, express_1.default)();
const allowedOrigins = ["http://localhost"];
const options = {
    origin: allowedOrigins,
};
app.use(express_1.default.json());
app.use((0, cors_1.default)(options));
//app.use(cors);
app.listen(port, () => {
    console.log(`now listening on port http://localhost:${port}`);
});
app.post("/test", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    try {
        //console.log(req.body);
        let invoice_type_code = "";
        // Ensure b2bcust is always safe to access
        const b2bcust = {
            VAT_number: ((_a = req.body.b2bcust) === null || _a === void 0 ? void 0 : _a.VAT_number) || "",
            VAT_name: ((_b = req.body.b2bcust) === null || _b === void 0 ? void 0 : _b.VAT_name) || "",
            CRN_number: ((_c = req.body.b2bcust) === null || _c === void 0 ? void 0 : _c.CRN_number) || "",
            building_number: ((_d = req.body.b2bcust) === null || _d === void 0 ? void 0 : _d.building_number) || "",
            street: ((_e = req.body.b2bcust) === null || _e === void 0 ? void 0 : _e.street) || "",
            city: ((_f = req.body.b2bcust) === null || _f === void 0 ? void 0 : _f.city) || "",
            city_subdivision: ((_g = req.body.b2bcust) === null || _g === void 0 ? void 0 : _g.city_subdivision) || "",
            postal_zone: ((_h = req.body.b2bcust) === null || _h === void 0 ? void 0 : _h.postal_zone) || "",
        };
        // Select invoice type and B2B info
        const b2bInfo = req.body.head.type === "b2b"
            ? ((invoice_type_code = "0100000"), b2bcust)
            : ((invoice_type_code = "0200000"),
                {
                    VAT_number: "",
                    VAT_name: "",
                    CRN_number: "",
                    building_number: "",
                    street: "",
                    city: "",
                    city_subdivision: "",
                    postal_zone: "",
                });
        const egsunit1 = req.body.egs;
        const line_items1 = req.body.line || [];
        const invoice1 = new ZATCASimplifiedTaxInvoice_1.ZATCASimplifiedTaxInvoice({
            props: {
                egs_info: egsunit1,
                b2bInfo,
                invoice_counter_number: req.body.head.ICV,
                invoice_serial_number: req.body.head.invoice_no,
                issue_date: req.body.head.date,
                issue_time: req.body.head.time,
                previous_invoice_hash: req.body.head.previous_invoice_hash,
                line_items: line_items1,
                invoice_type: invoice_type_code,
                // cancelation: invoiceCredit,
            },
        });
        // console.log(egsunit1);
        // Init a new EGS
        const egs = new index_1.EGS(egsunit1);
        // New Keys for the EGS
        yield egs.generateNewKey();
        // Sign invoice
        //var { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice1, false);
        //console.log(signed_invoice_string);
        // Check invoice compliance
        //let complianceStatus = await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash);
        //console.log(complianceStatus.validationResults);
        // console.log(await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash));
        // console.log(util.inspect(await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash), { showHidden: false, depth: null, colors: true }));
        // if (complianceStatus.validationResults.status == "ERROR") {
        //   throw new Error(JSON.stringify(complianceStatus.validationResults.errorMessages));
        // }
        // if (complianceStatus.validationResults.status == "WARNING") {
        //   throw new Error(JSON.stringify(complianceStatus.validationResults.warningMessages));
        // }
        /*
        if (complianceStatus.validationResults.status === "ERROR") {
          return res.status(400).json({
            status: "ERROR",
            messages: complianceStatus.validationResults.errorMessages,
          });
        }
    
        if (complianceStatus.validationResults.status === "WARNING") {
          return res.status(200).json({
            status: "WARNING",
            messages: complianceStatus.validationResults.warningMessages,
          });
        }
          */
        var { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice1, true);
        // Report invoice production
        let a = yield egs.reportInvoice(signed_invoice_string, invoice_hash);
        console.log(signed_invoice_string);
        console.log(a.validationResults);
        // console.log(util.inspect(await egs.reportInvoice(signed_invoice_string, invoice_hash), { showHidden: false, depth: null, colors: true }));
        let qrValue = "";
        // If B2B, extract QR from cleared invoice XML
        if (req.body.head.type === "b2b") {
            const clearedInvoiceXml = Buffer.from(a.clearedInvoice, "base64").toString();
            const xmlDoc = new DOMParser().parseFromString(clearedInvoiceXml, "text/xml");
            const qrTag = Array.from(xmlDoc.getElementsByTagName("cac:AdditionalDocumentReference")).find((ref) => { var _a; return ((_a = ref.getElementsByTagName("cbc:ID")[0]) === null || _a === void 0 ? void 0 : _a.textContent) === "QR"; });
            qrValue = ((_j = qrTag === null || qrTag === void 0 ? void 0 : qrTag.getElementsByTagName("cbc:EmbeddedDocumentBinaryObject")[0]) === null || _j === void 0 ? void 0 : _j.textContent) || "";
            if (!qrValue) {
                console.warn("QR tag not found in cleared invoice XML.");
            }
        }
        else {
            qrValue = qr;
        }
        //let encodeXML=Buffer.from(signed_invoice_string).toString("base64")
        // Render QR and send response
        //const qrcode = await renderQR(qrValue);
        res.status(200).send({ signed_invoice_string, invoice_hash, qrValue });
    }
    catch (error) {
        console.error("Error in /test:", ((_k = error === null || error === void 0 ? void 0 : error.response) === null || _k === void 0 ? void 0 : _k.data) || error);
        res.status(400).send(((_m = (_l = error === null || error === void 0 ? void 0 : error.response) === null || _l === void 0 ? void 0 : _l.data) === null || _m === void 0 ? void 0 : _m.validationResults) || ((_o = error === null || error === void 0 ? void 0 : error.response) === null || _o === void 0 ? void 0 : _o.data) || error.toString());
    }
}));
app.post("/credit", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
    try {
        // console.log(req.body);
        let invoice_type_code;
        // Ensure b2bcust is always safe to access
        const b2bcust = {
            VAT_number: ((_p = req.body.b2bcust) === null || _p === void 0 ? void 0 : _p.VAT_number) || "",
            VAT_name: ((_q = req.body.b2bcust) === null || _q === void 0 ? void 0 : _q.VAT_name) || "",
            CRN_number: ((_r = req.body.b2bcust) === null || _r === void 0 ? void 0 : _r.CRN_number) || "",
            building_number: ((_s = req.body.b2bcust) === null || _s === void 0 ? void 0 : _s.building_number) || "",
            street: ((_t = req.body.b2bcust) === null || _t === void 0 ? void 0 : _t.street) || "",
            city: ((_u = req.body.b2bcust) === null || _u === void 0 ? void 0 : _u.city) || "",
            city_subdivision: ((_v = req.body.b2bcust) === null || _v === void 0 ? void 0 : _v.city_subdivision) || "",
            postal_zone: ((_w = req.body.b2bcust) === null || _w === void 0 ? void 0 : _w.postal_zone) || "",
        };
        // Select invoice type and B2B info
        const b2bInfo = req.body.head.type === "b2b"
            ? ((invoice_type_code = "0100000"), b2bcust)
            : ((invoice_type_code = "0200000"),
                {
                    VAT_number: "",
                    VAT_name: "",
                    CRN_number: "",
                    building_number: "",
                    street: "",
                    city: "",
                    city_subdivision: "",
                    postal_zone: "",
                });
        //  console.log(invoice_type_code, b2bcust1);
        const egsunit1 = req.body.egs;
        const line_items1 = req.body.line;
        const invoiceCredit1 = {
            canceled_invoice_number: req.body.head.reference_invoice,
            payment_method: simplified_tax_invoice_template_1.ZATCAPaymentMethods.CASH,
            cancelation_type: simplified_tax_invoice_template_1.ZATCAInvoiceTypes.CREDIT_NOTE,
            reason: "CANCELLATION_OR_TERMINATION", //CANCELLATION_OR_TERMINATION
        };
        const invoice1 = new ZATCASimplifiedTaxInvoice_1.ZATCASimplifiedTaxInvoice({
            props: {
                egs_info: egsunit1,
                b2bInfo: b2bInfo,
                invoice_counter_number: req.body.head.ICV,
                invoice_serial_number: req.body.head.invoice_no,
                issue_date: req.body.head.date,
                issue_time: req.body.head.time,
                previous_invoice_hash: req.body.head.previous_invoice_hash,
                line_items: line_items1,
                invoice_type: invoice_type_code,
                cancelation: invoiceCredit1,
            },
        });
        // console.log(egsunit1);
        // Init a new EGS
        const egs = new index_1.EGS(egsunit1);
        // New Keys  for the EGS
        yield egs.generateNewKey();
        // console.log(egs);
        // Sign invoice
        //var { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice1, false);
        //console.log(signed_invoice_string);
        //// Check invoice compliance
        //let complianceStatus = await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash);
        //console.log(complianceStatus.validationResults);
        // console.log(await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash));
        // console.log(util.inspect(await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash), { showHidden: false, depth: null, colors: true }));
        /*
        if (complianceStatus.validationResults.status === "ERROR") {
          return res.status(400).json({
            status: "ERROR",
            messages: complianceStatus.validationResults.errorMessages,
          });
        }
    
        if (complianceStatus.validationResults.status === "WARNING") {
          return res.status(200).json({
            status: "WARNING",
            messages: complianceStatus.validationResults.warningMessages,
          });
        }
          */
        // Issue production certificate
        var { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice1, true);
        // Report invoice production
        let a = yield egs.reportInvoice(signed_invoice_string, invoice_hash);
        console.log(signed_invoice_string);
        console.log(a.validationResults);
        // console.log(util.inspect(await egs.reportInvoice(signed_invoice_string, invoice_hash), { showHidden: false, depth: null, colors: true }));
        let qrValue = "";
        // If B2B, extract QR from cleared invoice XML
        if (req.body.head.type === "b2b") {
            const clearedInvoiceXml = Buffer.from(a.clearedInvoice, "base64").toString();
            const xmlDoc = new DOMParser().parseFromString(clearedInvoiceXml, "text/xml");
            const qrTag = Array.from(xmlDoc.getElementsByTagName("cac:AdditionalDocumentReference")).find((ref) => { var _a; return ((_a = ref.getElementsByTagName("cbc:ID")[0]) === null || _a === void 0 ? void 0 : _a.textContent) === "QR"; });
            qrValue = ((_x = qrTag === null || qrTag === void 0 ? void 0 : qrTag.getElementsByTagName("cbc:EmbeddedDocumentBinaryObject")[0]) === null || _x === void 0 ? void 0 : _x.textContent) || "";
            if (!qrValue) {
                console.warn("QR tag not found in cleared invoice XML.");
            }
        }
        else {
            qrValue = qr;
        }
        // Render QR and send response
        //const qrcode = await renderQR(qrValue);
        res.status(200).send({ signed_invoice_string, invoice_hash, qrValue });
    }
    catch (error) {
        console.error("Error in /credit:", ((_y = error === null || error === void 0 ? void 0 : error.response) === null || _y === void 0 ? void 0 : _y.data) || error);
        res.status(400).send(((_0 = (_z = error === null || error === void 0 ? void 0 : error.response) === null || _z === void 0 ? void 0 : _z.data) === null || _0 === void 0 ? void 0 : _0.validationResults) || ((_1 = error === null || error === void 0 ? void 0 : error.response) === null || _1 === void 0 ? void 0 : _1.data) || error.toString());
    }
}));
app.post("/debit", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14;
    try {
        // console.log(req.body);
        let invoice_type_code;
        // Ensure b2bcust is always safe to access
        const b2bcust = {
            VAT_number: ((_2 = req.body.b2bcust) === null || _2 === void 0 ? void 0 : _2.VAT_number) || "",
            VAT_name: ((_3 = req.body.b2bcust) === null || _3 === void 0 ? void 0 : _3.VAT_name) || "",
            CRN_number: ((_4 = req.body.b2bcust) === null || _4 === void 0 ? void 0 : _4.CRN_number) || "",
            building_number: ((_5 = req.body.b2bcust) === null || _5 === void 0 ? void 0 : _5.building_number) || "",
            street: ((_6 = req.body.b2bcust) === null || _6 === void 0 ? void 0 : _6.street) || "",
            city: ((_7 = req.body.b2bcust) === null || _7 === void 0 ? void 0 : _7.city) || "",
            city_subdivision: ((_8 = req.body.b2bcust) === null || _8 === void 0 ? void 0 : _8.city_subdivision) || "",
            postal_zone: ((_9 = req.body.b2bcust) === null || _9 === void 0 ? void 0 : _9.postal_zone) || "",
        };
        // Select invoice type and B2B info
        const b2bInfo = req.body.head.type === "b2b"
            ? ((invoice_type_code = "0100000"), b2bcust)
            : ((invoice_type_code = "0200000"),
                {
                    VAT_number: "",
                    VAT_name: "",
                    CRN_number: "",
                    building_number: "",
                    street: "",
                    city: "",
                    city_subdivision: "",
                    postal_zone: "",
                });
        //  console.log(invoice_type_code, b2bcust1);
        const egsunit1 = req.body.egs;
        const line_items1 = req.body.line;
        const invoiceCredit1 = {
            canceled_invoice_number: req.body.head.reference_invoice,
            payment_method: simplified_tax_invoice_template_1.ZATCAPaymentMethods.CASH,
            cancelation_type: simplified_tax_invoice_template_1.ZATCAInvoiceTypes.DEBIT_NOTE,
            reason: "CANCELLATION_OR_TERMINATION", //CANCELLATION_OR_TERMINATION
        };
        const invoice1 = new ZATCASimplifiedTaxInvoice_1.ZATCASimplifiedTaxInvoice({
            props: {
                egs_info: egsunit1,
                b2bInfo: b2bInfo,
                invoice_counter_number: req.body.head.ICV,
                invoice_serial_number: req.body.head.invoice_no,
                issue_date: req.body.head.date,
                issue_time: req.body.head.time,
                previous_invoice_hash: req.body.head.previous_invoice_hash,
                line_items: line_items1,
                invoice_type: invoice_type_code,
                cancelation: invoiceCredit1,
            },
        });
        // console.log(egsunit1);
        // Init a new EGS
        const egs = new index_1.EGS(egsunit1);
        // New Keys  for the EGS
        yield egs.generateNewKey();
        // console.log(egs);
        // Sign invoice
        //var { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice1, false);
        //console.log(signed_invoice_string);
        // Check invoice compliance
        //let complianceStatus = await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash);
        //console.log(complianceStatus.validationResults);
        // console.log(await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash));
        // console.log(util.inspect(await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash), { showHidden: false, depth: null, colors: true }));
        /*
        if (complianceStatus.validationResults.status === "ERROR") {
          return res.status(400).json({
            status: "ERROR",
            messages: complianceStatus.validationResults.errorMessages,
          });
        }
    
        if (complianceStatus.validationResults.status === "WARNING") {
          return res.status(200).json({
            status: "WARNING",
            messages: complianceStatus.validationResults.warningMessages,
          });
        }
          */
        // Issue production certificate
        var { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice1, true);
        // Report invoice production
        let a = yield egs.reportInvoice(signed_invoice_string, invoice_hash);
        console.log(signed_invoice_string);
        console.log(a.validationResults);
        // console.log(util.inspect(await egs.reportInvoice(signed_invoice_string, invoice_hash), { showHidden: false, depth: null, colors: true }));
        let qrValue = "";
        // If B2B, extract QR from cleared invoice XML
        if (req.body.head.type === "b2b") {
            const clearedInvoiceXml = Buffer.from(a.clearedInvoice, "base64").toString();
            const xmlDoc = new DOMParser().parseFromString(clearedInvoiceXml, "text/xml");
            const qrTag = Array.from(xmlDoc.getElementsByTagName("cac:AdditionalDocumentReference")).find((ref) => { var _a; return ((_a = ref.getElementsByTagName("cbc:ID")[0]) === null || _a === void 0 ? void 0 : _a.textContent) === "QR"; });
            qrValue = ((_10 = qrTag === null || qrTag === void 0 ? void 0 : qrTag.getElementsByTagName("cbc:EmbeddedDocumentBinaryObject")[0]) === null || _10 === void 0 ? void 0 : _10.textContent) || "";
            if (!qrValue) {
                console.warn("QR tag not found in cleared invoice XML.");
            }
        }
        else {
            qrValue = qr;
        }
        // Render QR and send response
        //const qrcode = await renderQR(qrValue);
        res.status(200).send({ signed_invoice_string, invoice_hash, qrValue });
    }
    catch (error) {
        console.error("Error in /debit:", ((_11 = error === null || error === void 0 ? void 0 : error.response) === null || _11 === void 0 ? void 0 : _11.data) || error);
        res.status(400).send(((_13 = (_12 = error === null || error === void 0 ? void 0 : error.response) === null || _12 === void 0 ? void 0 : _12.data) === null || _13 === void 0 ? void 0 : _13.validationResults) || ((_14 = error === null || error === void 0 ? void 0 : error.response) === null || _14 === void 0 ? void 0 : _14.data) || error.toString());
    }
}));
function renderQR(text, options) {
    // const base64 = tagsToBase64(tags);
    return (0, qrcode_1.toDataURL)(text, options);
}
exports.renderQR = renderQR;
app.post("/onboard", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _15, _16;
    try {
        const egsunit1 = req.body.egs;
        // Init a new EGS
        const egs = new index_1.EGS(egsunit1);
        // New Keys & CSR for the EGS
        yield egs.generateNewKeysAndCSR(false, "DynamicSoft Solution LLC");
        // Issue a new compliance cert for the EGS
        var result = yield egs.issueComplianceCertificate(req.body.OTP);
        res.status(200).send(result);
    }
    catch (error) {
        console.error("Error in /onboard:", ((_15 = error === null || error === void 0 ? void 0 : error.response) === null || _15 === void 0 ? void 0 : _15.data) || error);
        res.status(400).send(((_16 = error === null || error === void 0 ? void 0 : error.response) === null || _16 === void 0 ? void 0 : _16.data) || error.toString());
    }
}));
app.post("/onboard2", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _17, _18;
    try {
        const egsunit1 = req.body.egs;
        // Init a new EGS
        const egs = new index_1.EGS(egsunit1);
        yield egs.generateNewKeysAndCSR(false, "DynamicSoft Solution LLC");
        // New Keys & CSR for the EGS
        //await egs.generateNewKey();
        // Issue a new compliance cert for the EGS
        var result = yield egs.issueProductionCertificate(req.body.compliance_id);
        //console.log(result);
        res.status(200).send(result);
    }
    catch (error) {
        console.error("Error in /onboard2:", ((_17 = error === null || error === void 0 ? void 0 : error.response) === null || _17 === void 0 ? void 0 : _17.data) || error);
        res.status(400).send(((_18 = error === null || error === void 0 ? void 0 : error.response) === null || _18 === void 0 ? void 0 : _18.data) || error.toString());
    }
}));
app.post("/onboard_dev", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _19, _20;
    try {
        const egsunit1 = req.body.egs;
        // Init a new EGS
        const egs = new index_1.EGS(egsunit1);
        // New Keys & CSR for the EGS
        yield egs.generateNewKeysAndCSR(false, "Ahmed Solution LLC");
        // Issue a new compliance cert
        var compliance_result = (yield egs.issueComplianceCertificate(req.body.OTP));
        console.log(compliance_result);
        var compliance_id = compliance_result.request_id;
        //Note: in simulation or core you have submt all inovices for compliance check before call the prodcution api
        // right now this developer mode we dont need to send all
        //The compliance certificate is not done with the following compliance steps yet [standard-compliant,standard-credit-note-compliant,standard-debit-note-compliant,simplified-compliant,simplified-credit-note-compliant,simplified-debit-note-compliant]
        // Issue a new production cert
        var prod_result = yield egs.issueProductionCertificate(compliance_id);
        console.log(prod_result);
        var result_res = { compliance_result: compliance_result, production_result: prod_result };
        res.status(200).send(result_res);
    }
    catch (error) {
        console.error("Error in /onboard_dev:", ((_19 = error === null || error === void 0 ? void 0 : error.response) === null || _19 === void 0 ? void 0 : _19.data) || error);
        res.status(400).send(((_20 = error === null || error === void 0 ? void 0 : error.response) === null || _20 === void 0 ? void 0 : _20.data) || error.toString());
    }
}));
app.post("/test2", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _21, _22, _23, _24, _25, _26, _27, _28, _29, _30;
    try {
        let invoice_type_code = "";
        // Ensure b2bcust is always safe to access
        const b2bcust = {
            VAT_number: ((_21 = req.body.b2bcust) === null || _21 === void 0 ? void 0 : _21.VAT_number) || "",
            VAT_name: ((_22 = req.body.b2bcust) === null || _22 === void 0 ? void 0 : _22.VAT_name) || "",
            CRN_number: ((_23 = req.body.b2bcust) === null || _23 === void 0 ? void 0 : _23.CRN_number) || "",
            building_number: ((_24 = req.body.b2bcust) === null || _24 === void 0 ? void 0 : _24.building_number) || "",
            street: ((_25 = req.body.b2bcust) === null || _25 === void 0 ? void 0 : _25.street) || "",
            city: ((_26 = req.body.b2bcust) === null || _26 === void 0 ? void 0 : _26.city) || "",
            city_subdivision: ((_27 = req.body.b2bcust) === null || _27 === void 0 ? void 0 : _27.city_subdivision) || "",
            postal_zone: ((_28 = req.body.b2bcust) === null || _28 === void 0 ? void 0 : _28.postal_zone) || "",
        };
        // Select invoice type and B2B info
        const b2bInfo = req.body.head.type === "b2b"
            ? ((invoice_type_code = "0100000"), b2bcust)
            : ((invoice_type_code = "0200000"),
                {
                    VAT_number: "",
                    VAT_name: "",
                    CRN_number: "",
                    building_number: "",
                    street: "",
                    city: "",
                    city_subdivision: "",
                    postal_zone: "",
                });
        const egsunit1 = req.body.egs;
        const line_items1 = req.body.line || [];
        const invoice1 = new ZATCASimplifiedTaxInvoice_1.ZATCASimplifiedTaxInvoice({
            props: {
                egs_info: egsunit1,
                b2bInfo,
                invoice_counter_number: 12,
                invoice_serial_number: req.body.head.invoice_no,
                issue_date: req.body.head.date,
                issue_time: req.body.head.time,
                previous_invoice_hash: req.body.head.previous_invoice_hash,
                line_items: line_items1,
                invoice_type: invoice_type_code,
                // cancelation: invoiceCredit,
            },
        });
        // Init a new EGS
        const egs = new index_1.EGS(egsunit1);
        // New Keys for the EGS
        yield egs.generateNewKey();
        // Sign invoice
        var { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice1, false);
        console.log(signed_invoice_string);
        // Check invoice compliance
        let complianceStatus = yield egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash);
        console.log(complianceStatus.validationResults);
        if (complianceStatus.validationResults.status === "ERROR") {
            return res.status(400).json({
                status: "ERROR",
                messages: complianceStatus.validationResults.errorMessages,
            });
        }
        res.status(200).send(complianceStatus);
    }
    catch (error) {
        console.error("Error in /test2:", ((_29 = error === null || error === void 0 ? void 0 : error.response) === null || _29 === void 0 ? void 0 : _29.data) || error);
        res.status(400).send(((_30 = error === null || error === void 0 ? void 0 : error.response) === null || _30 === void 0 ? void 0 : _30.data) || error.toString());
    }
}));
app.post("/credit2", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _31, _32, _33, _34, _35, _36, _37, _38, _39, _40;
    try {
        // console.log(req.body);
        let invoice_type_code;
        // Ensure b2bcust is always safe to access
        const b2bcust = {
            VAT_number: ((_31 = req.body.b2bcust) === null || _31 === void 0 ? void 0 : _31.VAT_number) || "",
            VAT_name: ((_32 = req.body.b2bcust) === null || _32 === void 0 ? void 0 : _32.VAT_name) || "",
            CRN_number: ((_33 = req.body.b2bcust) === null || _33 === void 0 ? void 0 : _33.CRN_number) || "",
            building_number: ((_34 = req.body.b2bcust) === null || _34 === void 0 ? void 0 : _34.building_number) || "",
            street: ((_35 = req.body.b2bcust) === null || _35 === void 0 ? void 0 : _35.street) || "",
            city: ((_36 = req.body.b2bcust) === null || _36 === void 0 ? void 0 : _36.city) || "",
            city_subdivision: ((_37 = req.body.b2bcust) === null || _37 === void 0 ? void 0 : _37.city_subdivision) || "",
            postal_zone: ((_38 = req.body.b2bcust) === null || _38 === void 0 ? void 0 : _38.postal_zone) || "",
        };
        // Select invoice type and B2B info
        const b2bInfo = req.body.head.type === "b2b"
            ? ((invoice_type_code = "0100000"), b2bcust)
            : ((invoice_type_code = "0200000"),
                {
                    VAT_number: "",
                    VAT_name: "",
                    CRN_number: "",
                    building_number: "",
                    street: "",
                    city: "",
                    city_subdivision: "",
                    postal_zone: "",
                });
        //  console.log(invoice_type_code, b2bcust1);
        const egsunit1 = req.body.egs;
        const line_items1 = req.body.line;
        const invoiceCredit1 = {
            canceled_invoice_number: req.body.head.reference_invoice,
            payment_method: simplified_tax_invoice_template_1.ZATCAPaymentMethods.CASH,
            cancelation_type: simplified_tax_invoice_template_1.ZATCAInvoiceTypes.CREDIT_NOTE,
            reason: "CANCELLATION_OR_TERMINATION", //CANCELLATION_OR_TERMINATION
        };
        const invoice1 = new ZATCASimplifiedTaxInvoice_1.ZATCASimplifiedTaxInvoice({
            props: {
                egs_info: egsunit1,
                b2bInfo: b2bInfo,
                invoice_counter_number: 1,
                invoice_serial_number: req.body.head.invoice_no,
                issue_date: req.body.head.date,
                issue_time: req.body.head.time,
                previous_invoice_hash: req.body.head.previous_invoice_hash,
                line_items: line_items1,
                invoice_type: invoice_type_code,
                cancelation: invoiceCredit1,
            },
        });
        // console.log(egsunit1);
        // Init a new EGS
        const egs = new index_1.EGS(egsunit1);
        // New Keys  for the EGS
        yield egs.generateNewKey();
        // console.log(egs);
        // Sign invoice
        var { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice1, false);
        console.log(signed_invoice_string);
        // Check invoice compliance
        let complianceStatus = yield egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash);
        console.log(complianceStatus.validationResults);
        // console.log(await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash));
        // console.log(util.inspect(await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash), { showHidden: false, depth: null, colors: true }));
        if (complianceStatus.validationResults.status === "ERROR") {
            return res.status(400).json({
                status: "ERROR",
                messages: complianceStatus.validationResults.errorMessages,
            });
        }
        res.status(200).send(complianceStatus);
    }
    catch (error) {
        console.error("Error in /credit2:", ((_39 = error === null || error === void 0 ? void 0 : error.response) === null || _39 === void 0 ? void 0 : _39.data) || error);
        res.status(400).send(((_40 = error === null || error === void 0 ? void 0 : error.response) === null || _40 === void 0 ? void 0 : _40.data) || error.toString());
    }
}));
app.post("/debit2", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _41, _42, _43, _44, _45, _46, _47, _48, _49, _50;
    try {
        // console.log(req.body);
        let invoice_type_code;
        // Ensure b2bcust is always safe to access
        const b2bcust = {
            VAT_number: ((_41 = req.body.b2bcust) === null || _41 === void 0 ? void 0 : _41.VAT_number) || "",
            VAT_name: ((_42 = req.body.b2bcust) === null || _42 === void 0 ? void 0 : _42.VAT_name) || "",
            CRN_number: ((_43 = req.body.b2bcust) === null || _43 === void 0 ? void 0 : _43.CRN_number) || "",
            building_number: ((_44 = req.body.b2bcust) === null || _44 === void 0 ? void 0 : _44.building_number) || "",
            street: ((_45 = req.body.b2bcust) === null || _45 === void 0 ? void 0 : _45.street) || "",
            city: ((_46 = req.body.b2bcust) === null || _46 === void 0 ? void 0 : _46.city) || "",
            city_subdivision: ((_47 = req.body.b2bcust) === null || _47 === void 0 ? void 0 : _47.city_subdivision) || "",
            postal_zone: ((_48 = req.body.b2bcust) === null || _48 === void 0 ? void 0 : _48.postal_zone) || "",
        };
        // Select invoice type and B2B info
        const b2bInfo = req.body.head.type === "b2b"
            ? ((invoice_type_code = "0100000"), b2bcust)
            : ((invoice_type_code = "0200000"),
                {
                    VAT_number: "",
                    VAT_name: "",
                    CRN_number: "",
                    building_number: "",
                    street: "",
                    city: "",
                    city_subdivision: "",
                    postal_zone: "",
                });
        //  console.log(invoice_type_code, b2bcust1);
        const egsunit1 = req.body.egs;
        const line_items1 = req.body.line;
        const invoiceCredit1 = {
            canceled_invoice_number: req.body.head.reference_invoice,
            payment_method: simplified_tax_invoice_template_1.ZATCAPaymentMethods.CASH,
            cancelation_type: simplified_tax_invoice_template_1.ZATCAInvoiceTypes.DEBIT_NOTE,
            reason: "CANCELLATION_OR_TERMINATION", //CANCELLATION_OR_TERMINATION
        };
        const invoice1 = new ZATCASimplifiedTaxInvoice_1.ZATCASimplifiedTaxInvoice({
            props: {
                egs_info: egsunit1,
                b2bInfo: b2bInfo,
                invoice_counter_number: 1,
                invoice_serial_number: req.body.head.invoice_no,
                issue_date: req.body.head.date,
                issue_time: req.body.head.time,
                previous_invoice_hash: req.body.head.previous_invoice_hash,
                line_items: line_items1,
                invoice_type: invoice_type_code,
                cancelation: invoiceCredit1,
            },
        });
        // console.log(egsunit1);
        // Init a new EGS
        const egs = new index_1.EGS(egsunit1);
        // New Keys  for the EGS
        yield egs.generateNewKey();
        // console.log(egs);
        // Sign invoice
        var { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice1, false);
        console.log(signed_invoice_string);
        // Check invoice compliance
        let complianceStatus = yield egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash);
        console.log(complianceStatus.validationResults);
        // console.log(await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash));
        // console.log(util.inspect(await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash), { showHidden: false, depth: null, colors: true }));
        if (complianceStatus.validationResults.status === "ERROR") {
            return res.status(400).json({
                status: "ERROR",
                messages: complianceStatus.validationResults.errorMessages,
            });
        }
        res.status(200).send(complianceStatus);
    }
    catch (error) {
        console.error("Error in /debit2:", ((_49 = error === null || error === void 0 ? void 0 : error.response) === null || _49 === void 0 ? void 0 : _49.data) || error);
        res.status(400).send(((_50 = error === null || error === void 0 ? void 0 : error.response) === null || _50 === void 0 ? void 0 : _50.data) || error.toString());
    }
}));
/*
interface ProcessInvoiceParams {
  b2bcust: b2bInfoCust;
  egsunit: EGSUnitInfo;
  lineItems: ZATCASimplifiedInvoiceLineItem[];
  head: {
    invoice_no: string;
    date: string;
    time: string;
    previous_invoice_hash: string;
    reference_invoice?: string;
  };
  invoiceTypeCode: string;
  cancelation?: ZATCASimplifiedInvoicCancelation;
}

async function processInvoice({
  b2bcust,
  egsunit,
  lineItems,
  head,
  invoiceTypeCode,
  cancelation,
}: ProcessInvoiceParams) {
  const invoice = new ZATCASimplifiedTaxInvoice({
    props: {
      egs_info: egsunit,
      b2bInfo: b2bcust,
      invoice_counter_number: 1, // or your dynamic value
      invoice_serial_number: head.invoice_no,
      issue_date: head.date,
      issue_time: head.time,
      previous_invoice_hash: head.previous_invoice_hash,
      line_items: lineItems,
      invoice_type: invoiceTypeCode,
      cancelation,
    },
  });

  // Init EGS
  const egs = new EGS(egsunit);

  // Generate keys
  await egs.generateNewKey();

  // Sign invoice
  const { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice, false);

  // Check compliance
  const complianceStatus = await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash);

  if (complianceStatus.validationResults.status === "ERROR") {
    throw new Error(JSON.stringify(complianceStatus.validationResults.errorMessages));
  }

  return complianceStatus;
}
app.post("/test2", async (req, res) => {
  try {
    const result = await processInvoice({
      b2bcust: req.body.b2bcust,
      egsunit: req.body.egs,
      lineItems: req.body.line,
      head: req.body.head,
      invoiceTypeCode: "0200000",
      cancelation: undefined,
    });
    res.status(200).send(result);
  } catch (err: any) {
    res.status(400).send(err.toString());
  }
});

app.post("/credit2", async (req, res) => {
  try {
    const result = await processInvoice({
      b2bcust: req.body.b2bcust,
      egsunit: req.body.egs,
      lineItems: req.body.line,
      head: req.body.head,
      invoiceTypeCode: "0200000",
      cancelation: {
        canceled_invoice_number: req.body.head.reference_invoice,
        payment_method: ZATCAPaymentMethods.CASH,
        cancelation_type: ZATCAInvoiceTypes.CREDIT_NOTE,
        reason: "CANCELLATION_OR_TERMINATION",
      },
    });
    res.status(200).send(result);
  } catch (err: any) {
    res.status(400).send(err.toString());
  }
});

app.post("/debit2", async (req, res) => {
  try {
    const result = await processInvoice({
      b2bcust: req.body.b2bcust,
      egsunit: req.body.egs,
      lineItems: req.body.line,
      head: req.body.head,
      invoiceTypeCode: "0200000",
      cancelation: {
        canceled_invoice_number: req.body.head.reference_invoice,
        payment_method: ZATCAPaymentMethods.CASH,
        cancelation_type: ZATCAInvoiceTypes.DEBIT_NOTE,
        reason: "CANCELLATION_OR_TERMINATION",
      },
    });
    res.status(200).send(result);
  } catch (err: any) {
    res.status(400).send(err.toString());
  }
});

app.post("/testing", async (req, res) => {
  try {
    const normalInvoice = await processInvoice({
      b2bcust: req.body.b2bcust,
      egsunit: req.body.egs,
      lineItems: req.body.line,
      head: req.body.head,
      invoiceTypeCode: "0200000",
      cancelation: undefined,
    });

    const creditInvoice = await processInvoice({
      b2bcust: req.body.b2bcust,
      egsunit: req.body.egs,
      lineItems: req.body.line,
      head: req.body.head,
      invoiceTypeCode: "0200000",
      cancelation: {
        canceled_invoice_number: req.body.head.reference_invoice,
        payment_method: ZATCAPaymentMethods.CASH,
        cancelation_type: ZATCAInvoiceTypes.CREDIT_NOTE,
        reason: "CANCELLATION_OR_TERMINATION",
      },
    });

    const debitInvoice = await processInvoice({
      b2bcust: req.body.b2bcust,
      egsunit: req.body.egs,
      lineItems: req.body.line,
      head: req.body.head,
      invoiceTypeCode: "0200000",
      cancelation: {
        canceled_invoice_number: req.body.head.reference_invoice,
        payment_method: ZATCAPaymentMethods.CASH,
        cancelation_type: ZATCAInvoiceTypes.DEBIT_NOTE,
        reason: "CANCELLATION_OR_TERMINATION",
      },
    });

    res.status(200).send({
      normal: normalInvoice,
      credit: creditInvoice,
      debit: debitInvoice,
    });
  } catch (err: any) {
    res.status(400).send(err.toString());
  }
});
*/
//main();
