"""
Extracts cells 1-17 of AutoNotes.ipynb (everything up through
generate_auto_notes_hybrid) into a plain pipeline.py module that
app.py can import.

Cells 18+ (the example run, evaluation, and report-generation cells)
are intentionally excluded — the FastAPI server calls
generate_auto_notes_hybrid() directly instead.

Usage:
    python extract_pipeline.py /path/to/AutoNotes.ipynb
"""

import json
import sys
from pathlib import Path

STOP_AFTER_CELL = 17  # generate_auto_notes_hybrid lives in Cell 17


def extract(nb_path: str, out_path: str = "pipeline.py") -> None:
    nb = json.loads(Path(nb_path).read_text(encoding="utf-8"))
    code_cells = [c for c in nb["cells"] if c["cell_type"] == "code"]

    chunks = []
    for i, cell in enumerate(code_cells[:STOP_AFTER_CELL], start=1):
        src = "".join(cell["source"])
        chunks.append(f"# ---- Cell {i} ----\n{src}\n")

    Path(out_path).write_text("\n".join(chunks), encoding="utf-8")
    print(f"Wrote {out_path} from {len(chunks)} cells of {nb_path}.")


if __name__ == "__main__":
    nb_arg = sys.argv[1] if len(sys.argv) > 1 else "AutoNotes.ipynb"
    extract(nb_arg)
