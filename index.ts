import express, { Express, Request, Response } from "express";
import { EGS, EGSUnitInfo } from "./zatca/egs/index";
//import { ZATCASimplifiedInvoiceLineItem } from "./zatca/templates/simplified_tax_invoice_template";
import { ZATCASimplifiedTaxInvoice } from "./zatca/ZATCASimplifiedTaxInvoice";
import {
  ZATCAPaymentMethods,
  ZATCAInvoiceTypes,
  ZATCASimplifiedInvoicCancelation,
  ZATCASimplifiedInvoiceLineItem,
  b2bInfoCust,
} from "./zatca/templates/simplified_tax_invoice_template";
//import util from "util";
import cors from "cors";
//import QRCode from "qrcode";
//import path from "path";
//import dotenv from "dotenv";
//dotenv.config();
import { QRCodeToDataURLOptions, toDataURL } from "qrcode";
const port = process.env.PORT || 5000;

const app: Express = express();

const allowedOrigins = ["http://localhost", "https://fatoora.cc"];
const options: cors.CorsOptions = {
  origin: allowedOrigins,
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(express.json());
app.use(cors(options));
//app.use(cors);

app.get("/", (req, res) => {
  res.send({ status: "alive", environment: process.env.NODE_ENV || "development" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.use(["/test", "/credit", "/debit"], (req: Request, res: Response, next: any) => {
  res.header("Access-Control-Allow-Origin", "https://fatoora.cc");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.post("/test", async (req: Request, res: Response) => {
  try {
    //console.log(req.body);
    let invoice_type_code = "";

    // Ensure b2bcust is always safe to access
    const b2bcust: b2bInfoCust = {
      VAT_number: req.body.b2bcust?.VAT_number || "",
      VAT_name: req.body.b2bcust?.VAT_name || "",
      CRN_number: req.body.b2bcust?.CRN_number || "",
      building_number: req.body.b2bcust?.building_number || "",
      street: req.body.b2bcust?.street || "",
      city: req.body.b2bcust?.city || "",
      city_subdivision: req.body.b2bcust?.city_subdivision || "",
      postal_zone: req.body.b2bcust?.postal_zone || "",
    };

    // Select invoice type and B2B info
    const b2bInfo: b2bInfoCust =
      req.body.head.type === "b2b"
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

    const egsunit1: EGSUnitInfo = req.body.egs;
    const line_items1: ZATCASimplifiedInvoiceLineItem[] = req.body.line || [];

    const invoice1 = new ZATCASimplifiedTaxInvoice({
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
    const egs = new EGS(egsunit1);

    // New Keys for the EGS
    await egs.generateNewKey();

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
    let a = await egs.reportInvoice(signed_invoice_string, invoice_hash);
    console.log(signed_invoice_string);
    console.log(a.validationResults);
    // console.log(util.inspect(await egs.reportInvoice(signed_invoice_string, invoice_hash), { showHidden: false, depth: null, colors: true }));

    let qrValue = "";

    // If B2B, extract QR from cleared invoice XML
    if (req.body.head.type === "b2b") {
      const clearedInvoiceXml = Buffer.from(a.clearedInvoice, "base64").toString();
      const xmlDoc = new DOMParser().parseFromString(clearedInvoiceXml, "text/xml");

      const qrTag = Array.from(xmlDoc.getElementsByTagName("cac:AdditionalDocumentReference")).find(
        (ref) => ref.getElementsByTagName("cbc:ID")[0]?.textContent === "QR"
      );

      qrValue = qrTag?.getElementsByTagName("cbc:EmbeddedDocumentBinaryObject")[0]?.textContent || "";
      if (!qrValue) {
        console.warn("QR tag not found in cleared invoice XML.");
      }
    } else {
      qrValue = qr;
    }
    //let encodeXML=Buffer.from(signed_invoice_string).toString("base64")
    // Render QR and send response
    //const qrcode = await renderQR(qrValue);
    res.status(200).send({ signed_invoice_string, invoice_hash, qrValue });
  } catch (error: any) {
    console.error("Error in /test:", error?.response?.data || error);
    res.status(400).send(error?.response?.data?.validationResults || error?.response?.data || error.toString());
  }
});

app.post("/credit", async (req: Request, res: Response) => {
  try {
    // console.log(req.body);
    let invoice_type_code: string;

    // Ensure b2bcust is always safe to access
    const b2bcust: b2bInfoCust = {
      VAT_number: req.body.b2bcust?.VAT_number || "",
      VAT_name: req.body.b2bcust?.VAT_name || "",
      CRN_number: req.body.b2bcust?.CRN_number || "",
      building_number: req.body.b2bcust?.building_number || "",
      street: req.body.b2bcust?.street || "",
      city: req.body.b2bcust?.city || "",
      city_subdivision: req.body.b2bcust?.city_subdivision || "",
      postal_zone: req.body.b2bcust?.postal_zone || "",
    };

    // Select invoice type and B2B info
    const b2bInfo: b2bInfoCust =
      req.body.head.type === "b2b"
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
    const egsunit1: EGSUnitInfo = req.body.egs;
    const line_items1: ZATCASimplifiedInvoiceLineItem[] = req.body.line;
    const invoiceCredit1: ZATCASimplifiedInvoicCancelation = {
      canceled_invoice_number: req.body.head.reference_invoice,
      payment_method: ZATCAPaymentMethods.CASH,
      cancelation_type: ZATCAInvoiceTypes.CREDIT_NOTE,
      reason: "CANCELLATION_OR_TERMINATION", //CANCELLATION_OR_TERMINATION
    };
    const invoice1 = new ZATCASimplifiedTaxInvoice({
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
    const egs = new EGS(egsunit1);

    // New Keys  for the EGS
    await egs.generateNewKey();

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
    let a = await egs.reportInvoice(signed_invoice_string, invoice_hash);
    console.log(signed_invoice_string);
    console.log(a.validationResults);
    // console.log(util.inspect(await egs.reportInvoice(signed_invoice_string, invoice_hash), { showHidden: false, depth: null, colors: true }));
    let qrValue = "";

    // If B2B, extract QR from cleared invoice XML
    if (req.body.head.type === "b2b") {
      const clearedInvoiceXml = Buffer.from(a.clearedInvoice, "base64").toString();
      const xmlDoc = new DOMParser().parseFromString(clearedInvoiceXml, "text/xml");

      const qrTag = Array.from(xmlDoc.getElementsByTagName("cac:AdditionalDocumentReference")).find(
        (ref) => ref.getElementsByTagName("cbc:ID")[0]?.textContent === "QR"
      );

      qrValue = qrTag?.getElementsByTagName("cbc:EmbeddedDocumentBinaryObject")[0]?.textContent || "";
      if (!qrValue) {
        console.warn("QR tag not found in cleared invoice XML.");
      }
    } else {
      qrValue = qr;
    }

    // Render QR and send response
    //const qrcode = await renderQR(qrValue);
    res.status(200).send({ signed_invoice_string, invoice_hash, qrValue });
  } catch (error: any) {
    console.error("Error in /credit:", error?.response?.data || error);
    res.status(400).send(error?.response?.data?.validationResults || error?.response?.data || error.toString());
  }
});

app.post("/debit", async (req: Request, res: Response) => {
  try {
    // console.log(req.body);
    let invoice_type_code: string;

    // Ensure b2bcust is always safe to access
    const b2bcust: b2bInfoCust = {
      VAT_number: req.body.b2bcust?.VAT_number || "",
      VAT_name: req.body.b2bcust?.VAT_name || "",
      CRN_number: req.body.b2bcust?.CRN_number || "",
      building_number: req.body.b2bcust?.building_number || "",
      street: req.body.b2bcust?.street || "",
      city: req.body.b2bcust?.city || "",
      city_subdivision: req.body.b2bcust?.city_subdivision || "",
      postal_zone: req.body.b2bcust?.postal_zone || "",
    };

    // Select invoice type and B2B info
    const b2bInfo: b2bInfoCust =
      req.body.head.type === "b2b"
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
    const egsunit1: EGSUnitInfo = req.body.egs;
    const line_items1: ZATCASimplifiedInvoiceLineItem[] = req.body.line;
    const invoiceCredit1: ZATCASimplifiedInvoicCancelation = {
      canceled_invoice_number: req.body.head.reference_invoice,
      payment_method: ZATCAPaymentMethods.CASH,
      cancelation_type: ZATCAInvoiceTypes.DEBIT_NOTE,
      reason: "CANCELLATION_OR_TERMINATION", //CANCELLATION_OR_TERMINATION
    };
    const invoice1 = new ZATCASimplifiedTaxInvoice({
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
    const egs = new EGS(egsunit1);

    // New Keys  for the EGS
    await egs.generateNewKey();

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
    let a = await egs.reportInvoice(signed_invoice_string, invoice_hash);
    console.log(signed_invoice_string);
    console.log(a.validationResults);
    // console.log(util.inspect(await egs.reportInvoice(signed_invoice_string, invoice_hash), { showHidden: false, depth: null, colors: true }));
    let qrValue = "";

    // If B2B, extract QR from cleared invoice XML
    if (req.body.head.type === "b2b") {
      const clearedInvoiceXml = Buffer.from(a.clearedInvoice, "base64").toString();
      const xmlDoc = new DOMParser().parseFromString(clearedInvoiceXml, "text/xml");

      const qrTag = Array.from(xmlDoc.getElementsByTagName("cac:AdditionalDocumentReference")).find(
        (ref) => ref.getElementsByTagName("cbc:ID")[0]?.textContent === "QR"
      );

      qrValue = qrTag?.getElementsByTagName("cbc:EmbeddedDocumentBinaryObject")[0]?.textContent || "";
      if (!qrValue) {
        console.warn("QR tag not found in cleared invoice XML.");
      }
    } else {
      qrValue = qr;
    }

    // Render QR and send response
    //const qrcode = await renderQR(qrValue);
    res.status(200).send({ signed_invoice_string, invoice_hash, qrValue });
  } catch (error: any) {
    console.error("Error in /debit:", error?.response?.data || error);
    res.status(400).send(error?.response?.data?.validationResults || error?.response?.data || error.toString());
  }
});

export function renderQR(text: string, options?: QRCodeToDataURLOptions): Promise<string> {
  // const base64 = tagsToBase64(tags);
  return toDataURL(text, options);
}

app.post("/onboard", async (req: Request, res: Response) => {
  try {
    const egsunit1: EGSUnitInfo = req.body.egs;
    // Init a new EGS
    const egs = new EGS(egsunit1);

    // New Keys & CSR for the EGS
    await egs.generateNewKeysAndCSR(false, "DynamicSoft Solution LLC");

    // Issue a new compliance cert for the EGS
    var result = await egs.issueComplianceCertificate(req.body.OTP);

    res.status(200).send(result);
  } catch (error: any) {
    console.error("Error in /onboard:", error?.response?.data || error);
    res.status(400).send(error?.response?.data || error.toString());
  }
});

app.post("/onboard2", async (req: Request, res: Response) => {
  try {
    const egsunit1: EGSUnitInfo = req.body.egs;
    // Init a new EGS
    const egs = new EGS(egsunit1);
    await egs.generateNewKeysAndCSR(false, "DynamicSoft Solution LLC");

    // New Keys & CSR for the EGS
    //await egs.generateNewKey();
    // Issue a new compliance cert for the EGS
    var result = await egs.issueProductionCertificate(req.body.compliance_id);
    //console.log(result);

    res.status(200).send(result);
  } catch (error: any) {
    console.error("Error in /onboard2:", error?.response?.data || error);
    res.status(400).send(error?.response?.data || error.toString());
  }
});

app.post("/onboard_dev", async (req: Request, res: Response) => {
  try {
    const egsunit1: EGSUnitInfo = req.body.egs;

    // Init a new EGS
    const egs = new EGS(egsunit1);

    // New Keys & CSR for the EGS
    await egs.generateNewKeysAndCSR(false, "Ahmed Solution LLC");

    interface ComplianceCertificateResponse {
      issued_certificate: string;
      request_id: string;
    }
    // Issue a new compliance cert
    var compliance_result = (await egs.issueComplianceCertificate(req.body.OTP)) as ComplianceCertificateResponse;
    console.log(compliance_result);

    var compliance_id = compliance_result.request_id;

    //Note: in simulation or core you have submt all inovices for compliance check before call the prodcution api
    // right now this developer mode we dont need to send all

    //The compliance certificate is not done with the following compliance steps yet [standard-compliant,standard-credit-note-compliant,standard-debit-note-compliant,simplified-compliant,simplified-credit-note-compliant,simplified-debit-note-compliant]
    // Issue a new production cert
    var prod_result = await egs.issueProductionCertificate(compliance_id);
    console.log(prod_result);

    var result_res = { compliance_result: compliance_result, production_result: prod_result };

    res.status(200).send(result_res);
  } catch (error: any) {
    console.error("Error in /onboard_dev:", error?.response?.data || error);
    res.status(400).send(error?.response?.data || error.toString());
  }
});

app.post("/test2", async (req: Request, res: Response) => {
  try {
    let invoice_type_code = "";

    // Ensure b2bcust is always safe to access
    const b2bcust: b2bInfoCust = {
      VAT_number: req.body.b2bcust?.VAT_number || "",
      VAT_name: req.body.b2bcust?.VAT_name || "",
      CRN_number: req.body.b2bcust?.CRN_number || "",
      building_number: req.body.b2bcust?.building_number || "",
      street: req.body.b2bcust?.street || "",
      city: req.body.b2bcust?.city || "",
      city_subdivision: req.body.b2bcust?.city_subdivision || "",
      postal_zone: req.body.b2bcust?.postal_zone || "",
    };

    // Select invoice type and B2B info
    const b2bInfo: b2bInfoCust =
      req.body.head.type === "b2b"
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

    const egsunit1: EGSUnitInfo = req.body.egs;
    const line_items1: ZATCASimplifiedInvoiceLineItem[] = req.body.line || [];

    const invoice1 = new ZATCASimplifiedTaxInvoice({
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
    const egs = new EGS(egsunit1);

    // New Keys for the EGS
    await egs.generateNewKey();

    // Sign invoice
    var { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice1, false);
    console.log(signed_invoice_string);

    // Check invoice compliance
    let complianceStatus = await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash);
    console.log(complianceStatus.validationResults);

    if (complianceStatus.validationResults.status === "ERROR") {
      return res.status(400).json({
        status: "ERROR",
        messages: complianceStatus.validationResults.errorMessages,
      });
    }

    res.status(200).send(complianceStatus);
  } catch (error: any) {
    console.error("Error in /test2:", error?.response?.data || error);
    res.status(400).send(error?.response?.data || error.toString());
  }
});

app.post("/credit2", async (req: Request, res: Response) => {
  try {
    // console.log(req.body);
    let invoice_type_code: string;

    // Ensure b2bcust is always safe to access
    const b2bcust: b2bInfoCust = {
      VAT_number: req.body.b2bcust?.VAT_number || "",
      VAT_name: req.body.b2bcust?.VAT_name || "",
      CRN_number: req.body.b2bcust?.CRN_number || "",
      building_number: req.body.b2bcust?.building_number || "",
      street: req.body.b2bcust?.street || "",
      city: req.body.b2bcust?.city || "",
      city_subdivision: req.body.b2bcust?.city_subdivision || "",
      postal_zone: req.body.b2bcust?.postal_zone || "",
    };

    // Select invoice type and B2B info
    const b2bInfo: b2bInfoCust =
      req.body.head.type === "b2b"
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
    const egsunit1: EGSUnitInfo = req.body.egs;
    const line_items1: ZATCASimplifiedInvoiceLineItem[] = req.body.line;
    const invoiceCredit1: ZATCASimplifiedInvoicCancelation = {
      canceled_invoice_number: req.body.head.reference_invoice,
      payment_method: ZATCAPaymentMethods.CASH,
      cancelation_type: ZATCAInvoiceTypes.CREDIT_NOTE,
      reason: "CANCELLATION_OR_TERMINATION", //CANCELLATION_OR_TERMINATION
    };
    const invoice1 = new ZATCASimplifiedTaxInvoice({
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
    const egs = new EGS(egsunit1);

    // New Keys  for the EGS
    await egs.generateNewKey();

    // console.log(egs);

    // Sign invoice
    var { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice1, false);
    console.log(signed_invoice_string);
    // Check invoice compliance
    let complianceStatus = await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash);
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
  } catch (error: any) {
    console.error("Error in /credit2:", error?.response?.data || error);
    res.status(400).send(error?.response?.data || error.toString());
  }
});

app.post("/debit2", async (req: Request, res: Response) => {
  try {
    // console.log(req.body);
    let invoice_type_code: string;

    // Ensure b2bcust is always safe to access
    const b2bcust: b2bInfoCust = {
      VAT_number: req.body.b2bcust?.VAT_number || "",
      VAT_name: req.body.b2bcust?.VAT_name || "",
      CRN_number: req.body.b2bcust?.CRN_number || "",
      building_number: req.body.b2bcust?.building_number || "",
      street: req.body.b2bcust?.street || "",
      city: req.body.b2bcust?.city || "",
      city_subdivision: req.body.b2bcust?.city_subdivision || "",
      postal_zone: req.body.b2bcust?.postal_zone || "",
    };

    // Select invoice type and B2B info
    const b2bInfo: b2bInfoCust =
      req.body.head.type === "b2b"
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
    const egsunit1: EGSUnitInfo = req.body.egs;
    const line_items1: ZATCASimplifiedInvoiceLineItem[] = req.body.line;
    const invoiceCredit1: ZATCASimplifiedInvoicCancelation = {
      canceled_invoice_number: req.body.head.reference_invoice,
      payment_method: ZATCAPaymentMethods.CASH,
      cancelation_type: ZATCAInvoiceTypes.DEBIT_NOTE,
      reason: "CANCELLATION_OR_TERMINATION", //CANCELLATION_OR_TERMINATION
    };
    const invoice1 = new ZATCASimplifiedTaxInvoice({
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
    const egs = new EGS(egsunit1);

    // New Keys  for the EGS
    await egs.generateNewKey();

    // console.log(egs);

    // Sign invoice
    var { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice1, false);
    console.log(signed_invoice_string);
    // Check invoice compliance
    let complianceStatus = await egs.checkInvoiceCompliance(signed_invoice_string, invoice_hash);
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
  } catch (error: any) {
    console.error("Error in /debit2:", error?.response?.data || error);
    res.status(400).send(error?.response?.data || error.toString());
  }
});

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
