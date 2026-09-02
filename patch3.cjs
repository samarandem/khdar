const fs = require('fs');
let code = fs.readFileSync('src/components/InvoicesListScreen.tsx', 'utf8');

code = code.replace(
  "import { pdfService } from '../services/pdfService';",
  "import { printHtmlElement } from '../services/pdfService';"
);

code = code.replace(
  "pdfService.printElement('printable-selected-invoices');",
  "printHtmlElement('printable-selected-invoices');"
);

fs.writeFileSync('src/components/InvoicesListScreen.tsx', code);
