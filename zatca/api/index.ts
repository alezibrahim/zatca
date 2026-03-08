import axios from "axios";
import { cleanUpCertificateString } from "../signing";
import { XMLDocument } from "../../parser";
import util from "util";
const settings = {
  API_VERSION: "V2",
  //SANDBOX_BASEURL: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
  // SANDBOX_BASEURL: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
  SANDBOX_BASEURL: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
};

interface ComplianceAPIInterface {
  /**
   * Requests a new compliance certificate and secret.
   * @param csr String CSR
   * @param otp String Tax payer provided OTP from Fatoora portal
   * @returns issued_certificate: string, api_secret: string, or throws on error.
   */
  issueCertificate: (
    csr: string,
    otp: string
  ) => Promise<{ issued_certificate: string; api_secret: string; request_id: string }>;
  /**
   * Checks compliance of a signed ZATCA XML.
   * @param signed_xml_string String.
   * @param invoice_hash String.
   * @param egs_uuid String.
   * @returns Any status.
   */
  checkInvoiceCompliance: (signed_xml_string: string, invoice_hash: string, egs_uuid: string) => Promise<any>;
}

interface ProductionAPIInterface {
  /**
   * Requests a new production certificate and secret.
   * @param compliance_request_id String compliance_request_id
   * @returns issued_certificate: string, api_secret: string, or throws on error.
   */
  issueCertificate: (
    compliance_request_id: string
  ) => Promise<{ issued_certificate: string; api_secret: string; request_id: string }>;

  /**
   * Report signed ZATCA XML.
   * @param signed_xml_string String.
   * @param invoice_hash String.
   * @param egs_uuid String.
   * @returns Any status.
   */
  reportInvoice: (signed_xml_string: string, invoice_hash: string, egs_uuid: string) => Promise<any>;
}

class API {
  constructor() { }

  private getAuthHeaders = (certificate?: string, secret?: string): any => {
    if (certificate && secret) {
      const certificate_stripped = cleanUpCertificateString(certificate);
      const basic = Buffer.from(`${Buffer.from(certificate_stripped).toString("base64")}:${secret}`).toString("base64");
      return {
        Authorization: `Basic ${basic}`,
      };
    }
    return {};
  };

  compliance(certificate?: string, secret?: string): ComplianceAPIInterface {
    const auth_headers = this.getAuthHeaders(certificate, secret);

    const issueCertificate = async (
      csr: string,
      otp: string
    ): Promise<{ issued_certificate: string; api_secret: string; request_id: string }> => {
      const headers = {
        "Accept-Version": settings.API_VERSION,
        OTP: otp,
      };

      const response = await axios.post(
        `${settings.SANDBOX_BASEURL}/compliance`,
        { csr: Buffer.from(csr).toString("base64") },
        { headers: { ...auth_headers, ...headers } }
      );

      if (response.status != 200) throw new Error("Error issuing a compliance certificate.");
      //ahmed

      let issued_certificate = response.data.binarySecurityToken;
      //issued_certificate = `-----BEGIN CERTIFICATE-----\n${issued_certificate}\n-----END CERTIFICATE-----`;
      const api_secret = response.data.secret;

      return { issued_certificate, api_secret, request_id: response.data.requestID };
    };

    const checkInvoiceCompliance = async (
      signed_xml_string: string,
      invoice_hash: string,
      egs_uuid: string
    ): Promise<any> => {
      const headers = {
        "Accept-Version": settings.API_VERSION,
        "Accept-Language": "en",
      };

      const response = await axios.post(
        `${settings.SANDBOX_BASEURL}/compliance/invoices`,
        {
          invoiceHash: invoice_hash,
          uuid: egs_uuid,
          invoice: Buffer.from(signed_xml_string).toString("base64"),
        },
        { headers: { ...auth_headers, ...headers } }
      );

      //console.log(util.inspect(response.data.validationResults, { showHidden: false, depth: null, colors: true }));
      //  if (response.status != 200) throw new Error("Error in compliance check.");
      return response.data;
    };

    return { issueCertificate, checkInvoiceCompliance };
  }

  production(certificate?: string, secret?: string): ProductionAPIInterface {
    const auth_headers = this.getAuthHeaders(certificate, secret);
    // console.log(auth_headers1);
    const basic = Buffer.from(`${certificate}:${secret}`).toString("base64");
    //for onbarding
    const auth_headers1 = {
      Authorization: `Basic ${basic}`,
    };
    //   console.log(auth_headers);

    const issueCertificate = async (
      compliance_request_id: string
    ): Promise<{ issued_certificate: string; api_secret: string; request_id: string }> => {
      const headers = {
        "Accept-Version": settings.API_VERSION,
      };

      const response = await axios.post(
        `${settings.SANDBOX_BASEURL}/production/csids`,
        { compliance_request_id: compliance_request_id },
        { headers: { ...auth_headers1, ...headers } }
      );
      //console.log(response.data);
      return response.data; /*
      if (response.status != 200) throw new Error("Error issuing a production certificate.");

      let issued_certificate = response.data.binarySecurityToken;
      //  issued_certificate = `-----BEGIN CERTIFICATE-----\n${issued_certificate}\n-----END CERTIFICATE-----`;
      const api_secret = response.data.secret;

      return { issued_certificate, api_secret, request_id: response.data.requestID };*/
    };

    const reportInvoice = async (signed_xml_string: string, invoice_hash: string, egs_uuid: string): Promise<any> => {
      const headers = {
        "Accept-Version": settings.API_VERSION,
        "Accept-Language": "en",
        "Clearance-Status": "1",
      };
      const invoice_copy = new XMLDocument(signed_xml_string);
      const invoiceType = invoice_copy.get("Invoice/cbc:InvoiceTypeCode")?.[0]["@_name"].toString();
      let url = "";
      if (invoiceType == "0200000") {
        url = "/invoices/reporting/single";
      } else {
        url = "/invoices/clearance/single";
      }
      // console.log(auth_headers);
      const response = await axios.post(
        `${settings.SANDBOX_BASEURL}${url}`,
        {
          invoiceHash: invoice_hash,
          uuid: egs_uuid,
          invoice: Buffer.from(signed_xml_string).toString("base64"),
        },
        { headers: { ...auth_headers, ...headers } }
      );

      //  console.log(util.inspect(response.data.validationResults, { showHidden: false, depth: null, colors: true }));
      //   if (response.status != 200) throw new Error("Error in reporting invoice.");
      //  console.log(response.data.validationResults);
      return response.data;
    };

    return {
      issueCertificate,
      reportInvoice,
    };
  }
}

export default API;
