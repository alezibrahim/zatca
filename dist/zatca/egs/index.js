"use strict";
/**
 * This module requires OpenSSL to be installed on the system.
 * Using an OpenSSL In order to generate secp256k1 key pairs.
 */
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
exports.EGS = void 0;
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
const api_1 = __importDefault(require("../api"));
const fs_1 = __importDefault(require("fs"));
const csr_template_1 = __importDefault(require("../templates/csr_template"));
const path_1 = __importDefault(require("path"));
const OpenSSL = (cmd) => {
    return new Promise((resolve, reject) => {
        try {
            const command = (0, child_process_1.spawn)("openssl", cmd);
            let result = "";
            command.stdout.on("data", (data) => {
                result += data.toString();
            });
            command.on("close", (code) => {
                return resolve(result);
            });
            command.on("error", (error) => {
                return reject(error);
            });
        }
        catch (error) {
            reject(error);
        }
    });
};
// Generate a secp256k1 key pair
// https://techdocs.akamai.com/iot-token-access-control/docs/generate-ecdsa-keys
// openssl ecparam -name secp256k1 -genkey -noout -out ec-secp256k1-priv-key.pem
const generateSecp256k1KeyPair = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield OpenSSL(["ecparam", "-name", "secp256k1", "-genkey"]);
        if (!result.includes("-----BEGIN EC PRIVATE KEY-----"))
            throw new Error("Error no private key found in OpenSSL output.");
        let private_key = `-----BEGIN EC PRIVATE KEY-----${result.split("-----BEGIN EC PRIVATE KEY-----")[1]}`.trim();
        //console.log(result, private_key);
        return private_key;
    }
    catch (error) {
        throw error;
    }
});
// Generate a signed ecdsaWithSHA256 CSR
// 2.2.2 Profile specification of the Cryptographic Stamp identifiers. & CSR field contents / RDNs.
const generateCSR = (egs_info, production, solution_name) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!egs_info.private_key)
        throw new Error("EGS has no private key");
    // const private_key_file = `${process.env.TEMP_FOLDER ?? "C:/temp/"}${uuidv4()}.pem`;
    //const csr_config_file = `${process.env.TEMP_FOLDER ?? "C:/temp/"}${uuidv4()}.cnf`;
    const private_key_file = path_1.default.join((_a = process.env.TEMP_FOLDER) !== null && _a !== void 0 ? _a : path_1.default.resolve(__dirname, "tmp"), `${(0, uuid_1.v4)()}.pem`);
    const csr_config_file = path_1.default.join((_b = process.env.TEMP_FOLDER) !== null && _b !== void 0 ? _b : path_1.default.resolve(__dirname, "tmp"), `${(0, uuid_1.v4)()}.cnf`);
    //const private_key_file = `${"/tmp/"}${uuidv4()}.pem`;
    //  const csr_config_file = `${"/tmp/"}${uuidv4()}.cnf`;
    fs_1.default.writeFileSync(private_key_file, egs_info.private_key);
    fs_1.default.writeFileSync(csr_config_file, (0, csr_template_1.default)({
        egs_model: "DSS",
        egs_serial_number: egs_info.uuid,
        solution_name: solution_name,
        vat_number: egs_info.VAT_number,
        branch_location: `${egs_info.location.building} ${egs_info.location.street}, ${egs_info.location.city}`,
        branch_industry: egs_info.branch_industry,
        branch_name: egs_info.branch_name,
        //branch_name: `${egs_info.location.city} Branch`,
        taxpayer_name: egs_info.VAT_name,
        taxpayer_provided_id: "923105305315",
        production: production,
    }));
    const cleanUp = () => {
        fs_1.default.unlink(private_key_file, () => { });
        fs_1.default.unlink(csr_config_file, () => { });
    };
    try {
        // const result = await OpenSSL(["req", "-new", "-sha256", "-key", private_key_file, "-config", csr_config_file]);
        const result = yield OpenSSL([
            "req",
            "-new",
            "-sha256",
            "-key",
            private_key_file,
            //"-extensions v3_req",
            "-config",
            csr_config_file,
        ]);
        // console.log(result);
        if (!result.includes("-----BEGIN CERTIFICATE REQUEST-----"))
            throw new Error("Error no CSR found in OpenSSL output.");
        let csr = `-----BEGIN CERTIFICATE REQUEST-----${result.split("-----BEGIN CERTIFICATE REQUEST-----")[1]}`.trim();
        //console.log(result);
        // console.log(csr, "..");
        cleanUp();
        return csr;
    }
    catch (error) {
        cleanUp();
        //console.log(error);
        throw error;
    }
});
class EGS {
    constructor(egs_info) {
        this.egs_info = egs_info;
        this.api = new api_1.default();
    }
    /**
     * @returns EGSUnitInfo
     */
    get() {
        return this.egs_info;
    }
    /**
     * Sets/Updates an EGS info field.
     * @param egs_info Partial<EGSUnitInfo>
     */
    set(egs_info) {
        this.egs_info = Object.assign(Object.assign({}, this.egs_info), egs_info);
    }
    //  Generates a new secp256k1 Public/Private key pair for the EGS.
    generateNewKey() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const new_private_key = yield generateSecp256k1KeyPair();
                this.egs_info.private_key = new_private_key;
                // this.egs_info.uuid = uuidv4();
                //decode base64 certificates
                let encode_compliance_certificate = new Buffer(this.egs_info.compliance_certificate, "base64").toString();
                encode_compliance_certificate = `-----BEGIN CERTIFICATE-----\n${encode_compliance_certificate}\n-----END CERTIFICATE-----`;
                this.egs_info.compliance_certificate = encode_compliance_certificate;
                let encode_production_certificate = new Buffer(this.egs_info.production_certificate, "base64").toString();
                encode_production_certificate = `-----BEGIN CERTIFICATE-----\n${encode_production_certificate}\n-----END CERTIFICATE-----`;
                this.egs_info.production_certificate = encode_production_certificate;
            }
            catch (error) {
                throw error;
            }
        });
    }
    /**
     * Generates a new secp256k1 Public/Private key pair for the EGS.
     * Also generates and signs a new CSR.
     * `Note`: This functions uses OpenSSL thus requires it to be installed on whatever system the package is running in.
     * @param production Boolean CSR or Compliance CSR
     * @param solution_name String name of solution generating certs.
     * @returns Promise void on success, throws error on fail.
     */
    generateNewKeysAndCSR(production, solution_name) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const new_private_key = yield generateSecp256k1KeyPair();
                this.egs_info.private_key = new_private_key;
                const new_csr = yield generateCSR(this.egs_info, production, solution_name);
                this.egs_info.csr = new_csr;
                // console.log(new_csr);
            }
            catch (error) {
                throw error;
            }
        });
    }
    /**
     * Generates a new compliance certificate through ZATCA API.
     * @param OTP String Tax payer provided from Fatoora portal to link to this EGS.
     * @returns Promise String compliance request id on success to be used in production CSID request, throws error on fail.
     */
    issueComplianceCertificate(OTP) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.egs_info.csr)
                throw new Error("EGS needs to generate a CSR first.");
            const issued_data = yield this.api.compliance().issueCertificate(this.egs_info.csr, OTP);
            this.egs_info.compliance_certificate = issued_data.issued_certificate;
            this.egs_info.compliance_api_secret = issued_data.api_secret;
            //console.log(issued_data)
            /*     let a =
            "TUlJQ2J6Q0NBaFdnQXdJQkFnSUdBWXVBMU96N01Bb0dDQ3FHU000OUJBTUNNQlV4RXpBUkJnTlZCQU1NQ21WSmJuWnZhV05wYm1jd0hoY05Nak14TURNd01UTTBOVEUwV2hjTk1qZ3hNREk1TWpFd01EQXdXakI5TVJjd0ZRWURWUVFEREE1RlIxTXhMVGc0TmpRek1URTBOVEVYTUJVR0ExVUVDd3dPVFhrZ1FuSmhibU5vSUU1aGJXVXhQREE2QmdOVkJBb01NMU5oYkdWb0lFRmlaSFZzSUVoaGJXVmxaQ0JCYkNCSVlYcHRhU0JVY21Ga2FXNW5JRU52YlhCaGJua2dUR2x0YVhSbFpERUxNQWtHQTFVRUJoTUNVMEV3VmpBUUJnY3Foa2pPUFFJQkJnVXJnUVFBQ2dOQ0FBVHMxZENyKzZjQ2JsdDROUG9EbWN6cXBPOTIwVW11ZHQ4aEdRTExRK05ua2RrM1Y4dENRUjBqME5RVFJaY01vMmI4bnpHZmg3MjhoLzd2WE5OazByWnVvNEhyTUlIb01Bd0dBMVVkRXdFQi93UUNNQUF3Z2RjR0ExVWRFUVNCenpDQnpLU0J5VENCeGpGUU1FNEdBMVVFQkF4SE1TMUVlVzVoYldsalUyOW1kQ0JUYjJ4MWRHbHZiaUJNVEVOOE1pMUpUMU44TXkwMlpqUmtNakJsTUMwMlltWmxMVFJoT0RBdE9UTTRPUzAzWkdGaVpUWTJNakJtTVRJeEh6QWRCZ29Ka2lhSmsvSXNaQUVCREE4ek1EQTJPVGMxTnpZek1EQXdNRE14RFRBTEJnTlZCQXdNQkRFeE1EQXhKakFrQmdOVkJCb01IVEF3TURBZ1VHRnNZWE4wYVc1bElITjBjbVZsZEN3Z1NtVmtaR0ZvTVJvd0dBWURWUVFQREJGTmIySnBiR1VnUld4bFkzUnliMjVwWXpBS0JnZ3Foa2pPUFFRREFnTklBREJGQWlCUjF5MkxMZ3ZXRWRBL2ZtcGpVSHQyYkJON0RRclh3dEU3RFJFTEo4WmFKUUloQU1BdnFJYU9FbzcwNU1jZWw1SHZoVDNBYjlZY0JUOWxGczh0Z0FkWEJEQkc=";
          this.egs_info.compliance_api_secret = "69qf0MdF15LI5snd/OGEMjwMJBFxYTySUaYyRiBVSi8=";
          let issued_certificate = new Buffer(a, "base64").toString();
          issued_certificate = `-----BEGIN CERTIFICATE-----\n${issued_certificate}\n-----END CERTIFICATE-----`;
          this.egs_info.compliance_certificate = issued_certificate;
        //   return issued_data.request_id;
          issued_data.request_id = "1698673519867";*/
            return issued_data;
        });
    }
    /**
     * Generates a new production certificate through ZATCA API.
     * @param compliance_request_id String compliance request ID generated from compliance CSID request.
     * @returns Promise String request id on success, throws error on fail.
     */
    issueProductionCertificate(compliance_request_id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.egs_info.compliance_certificate || !this.egs_info.compliance_api_secret)
                throw new Error("EGS is missing a certificate/private key/api secret to request a production certificate.");
            const issued_data = yield this.api
                .production(this.egs_info.compliance_certificate, this.egs_info.compliance_api_secret)
                .issueCertificate(compliance_request_id);
            // this.egs_info.production_certificate = issued_data.issued_certificate;
            // this.egs_info.production_api_secret = issued_data.api_secret;
            return issued_data;
        });
    }
    /**
     * Checks Invoice compliance with ZATCA API.
     * @param signed_invoice_string String.
     * @param invoice_hash String.
     * @returns Promise compliance data on success, throws error on fail.
     */
    checkInvoiceCompliance(signed_invoice_string, invoice_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.egs_info.compliance_certificate || !this.egs_info.compliance_api_secret)
                throw new Error("EGS is missing a certificate/private key/api secret to check the invoice compliance.");
            return yield this.api
                .compliance(this.egs_info.compliance_certificate, this.egs_info.compliance_api_secret)
                .checkInvoiceCompliance(signed_invoice_string, invoice_hash, this.egs_info.uuid);
        });
    }
    /**
     * Reports invoice with ZATCA API.
     * @param signed_invoice_string String.
     * @param invoice_hash String.
     * @returns Promise reporting data on success, throws error on fail.
     */
    reportInvoice(signed_invoice_string, invoice_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.egs_info.production_certificate || !this.egs_info.production_api_secret)
                throw new Error("EGS is missing a certificate/private key/api secret to report the invoice.");
            return yield this.api
                .production(this.egs_info.production_certificate, this.egs_info.production_api_secret)
                .reportInvoice(signed_invoice_string, invoice_hash, this.egs_info.uuid);
        });
    }
    /**
     * Signs a given invoice using the EGS certificate and keypairs.
     * @param invoice Invoice to sign
     * @param production Boolean production or compliance certificate.
     * @returns Promise void on success (signed_invoice_string: string, invoice_hash: string, qr: string), throws error on fail.
     */
    signInvoice(invoice, production) {
        //ahmed
        const certificate = production ? this.egs_info.production_certificate : this.egs_info.compliance_certificate;
        if (!certificate || !this.egs_info.private_key)
            throw new Error("EGS is missing a certificate/private key to sign the invoice.");
        return invoice.sign(certificate, this.egs_info.private_key);
    }
}
exports.EGS = EGS;
