# Template Rules

Instructions for agents on how to produce and format output files.

## General Rules

1. **Always copy from a template** before writing `.xlsx` or `.docx` files. Never create these formats from scratch.
2. **Preserve existing styles** — do not override or delete named styles from the template.
3. **Delete placeholder content** — remove any example/template sheets or paragraphs after adding your own content.
4. **File naming** — use lowercase kebab-case for output filenames (e.g., `contract-review-acme.docx`, `risk-matrix-q2.xlsx`).
5. **No empty files** — never produce a file with no meaningful content.

## Excel (.xlsx) Files

**Base template:** `./templates/report.xlsx`

**Usage:**
```python
import shutil
shutil.copy('./templates/report.xlsx', '<output_path>')
# Then open with openpyxl and modify
```

**Available named styles:**
| Style | Purpose |
|-------|---------|
| `title` | Document title (row 1) |
| `subtitle` | Section subtitle or date range |
| `header` | Column headers in data tables |
| `data` | Standard data cells |
| `data_label` | Row label cells (left column) |
| `section` | Section separator rows |
| `highlight_pos` | Positive values / favorable indicators |
| `highlight_neg` | Negative values / risk indicators |
| `pct` | Percentage-formatted cells |
| `currency` | Currency values (standard) |
| `currency_m` | Currency values in millions |

**Formatting requirements:**
- Always include a title row with the document name and date generated.
- Freeze the header row for data tables.
- Auto-fit column widths where possible (set minimum 12, maximum 50 characters).
- Use `highlight_pos` / `highlight_neg` for values that represent good/bad outcomes.
- Include a summary sheet when the workbook has more than 3 data sheets.
- Number format: use thousands separator for values > 999.

## Word (.docx) Files

**Base template:** `./templates/report.docx`

**Usage:**
```python
import shutil
shutil.copy('./templates/report.docx', '<output_path>')
# Then open with python-docx and modify
```

**Available styles:**
| Style | Purpose |
|-------|---------|
| `Heading 1` | Main section titles |
| `Heading 2` | Subsection titles |
| `Heading 3` | Sub-subsection titles |
| `Normal` | Body text paragraphs |
| `Medium Shading 1 Accent 1` | Table style |

**Document structure requirements:**
- Start with a `Heading 1` title that describes the deliverable.
- Include a metadata block immediately after the title: date, matter/client reference, prepared by (agent name).
- Use `Heading 2` for major sections.
- Keep paragraphs concise — prefer bullet lists over long prose blocks.
- Tables must use the `Medium Shading 1 Accent 1` style.
- Add page breaks before major sections in documents longer than 3 pages.

## Markdown (.md) Files

When output is markdown (not converted to .docx):

- Use ATX headers (`#`, `##`, `###`) — not setext (underline) style.
- Include a YAML-style metadata block at the top:
  ```
  ---
  title: <Document Title>
  date: <YYYY-MM-DD>
  agent: <agent-slug>
  ---
  ```
- Use fenced code blocks with language identifiers for any code or structured data.
- Tables must have aligned pipes and a header separator row.
- Limit line length to 120 characters where practical.

## JSON Output Files

- Pretty-print with 2-space indentation.
- Include a top-level `"metadata"` object with `"generated_at"` (ISO 8601), `"agent"`, and `"version"` fields.
- Arrays of objects should have consistent key ordering across entries.

## CSV Files

- UTF-8 encoding with BOM for Excel compatibility.
- First row is always headers.
- Use double quotes around fields that contain commas, newlines, or quotes.
- Date format: `YYYY-MM-DD`.
- Decimal separator: period (`.`).

## PDF Files

- Generate PDF only when explicitly requested by the user.
- Prefer producing `.docx` and letting the user convert, unless PDF is specifically required.
- If generating PDF directly, include page numbers in the footer and the document title in the header.

## Language and Tone

- Match the language of the user's request for the document content.
- Use formal, professional tone appropriate for legal deliverables.
- Avoid first person ("I found...") — use passive or third person ("The analysis reveals...").
- Define acronyms on first use.

## Adding a New Template

To add a new template to the system:

1. **Place the base file** in `templates/` (e.g., `templates/memo.docx` with the desired styles and formatting pre-configured).

2. **Update the TEMPLATE RULE** in `agents/_common.py` → `headless_append()` so that agents know the template exists and how to use it. Add a new line to the rule block:

   ```python
   "TEMPLATE RULE: When producing .xlsx or .docx files, ALWAYS copy from the templates first:\n"
   "  - Excel: copy ./templates/report.xlsx then modify (...)\n"
   "  - Word report: copy ./templates/report.docx then modify (...)\n"
   "  - Word memo: copy ./templates/memo.docx then modify (preserves Memo Title, To/From/Date fields, body styles)\n"
   ```

3. **Document the template** in this file — add a new section below describing the available styles, structure, and usage instructions for the new template.

4. **Test the template** by running an agent task that should produce output using it. Verify that styles are preserved and placeholder content is removed.

## What NOT to Do

- Do not invent or fabricate data to fill a template. If data is missing, leave the section blank with a `[DATA REQUIRED]` placeholder and inform the user.
- Do not include internal file paths, sandbox references, or system information in output files.
- Do not embed absolute paths to images or resources — use relative paths or inline content.
- Do not produce files larger than 10MB without warning the user first.
