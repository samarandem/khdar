const fs = require('fs');
let code = fs.readFileSync('src/components/InvoicesListScreen.tsx', 'utf8');

code = code.replace(
  "    </div>\n\n      {/* Sticky Selection Bar */}",
  "      {/* Sticky Selection Bar */}"
);

code = code.replace(
  "      </div>\n    </div>\n  );\n};",
  "      </div>\n    </div>\n  );\n};"
);

fs.writeFileSync('src/components/InvoicesListScreen.tsx', code);
