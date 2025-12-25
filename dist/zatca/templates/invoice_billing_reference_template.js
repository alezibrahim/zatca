"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const template = /* XML */ `
<cac:BillingReference>
<cac:InvoiceDocumentReference>
   <cbc:ID>SET_INVOICE_NUMBER</cbc:ID>
</cac:InvoiceDocumentReference>
</cac:BillingReference>`;
function populate(invoice_number) {
    let populated_template = template;
    populated_template = populated_template.replace("SET_INVOICE_NUMBER", `${invoice_number}`);
    return populated_template;
}
exports.default = populate;
