import type { ResumeData } from "@resume-engine/schema/resume/data";
import type { Template } from "@resume-engine/schema/templates";
import { useEffect, useMemo, useState } from "react";
import { createResumePdfBlob } from "@resume-engine/pdf/browser";
import { PdfCanvasDocument, PdfCanvasPage } from "@resume-engine/preview/pdf-canvas";
import { sampleResumeData } from "@resume-engine/schema/resume/sample";

// Dev-only review harness for RE-V0 (native resume engine vendoring).
// Renders the vendored sample resume through every template + page size so
// the user can pick which ~12 of 15 templates make the cut. No design polish
// intended — see .superpowers/sdd/task-REV0-report.md for context.

const TEMPLATES: Template[] = [
	"azurill",
	"bronzor",
	"chikorita",
	"ditgar",
	"ditto",
	"gengar",
	"glalie",
	"kakuna",
	"lapras",
	"leafish",
	"meowth",
	"onyx",
	"pikachu",
	"rhyhorn",
	"scizor",
];

const PAGE_FORMATS = ["a4", "letter"] as const;
type PageFormat = (typeof PAGE_FORMATS)[number];

export default function ResumeSmoke() {
	const [template, setTemplate] = useState<Template>("azurill");
	const [format, setFormat] = useState<PageFormat>("a4");
	const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
	const [error, setError] = useState<string | null>(null);

	const data: ResumeData = useMemo(
		() => ({
			...sampleResumeData,
			metadata: {
				...sampleResumeData.metadata,
				template,
				page: { ...sampleResumeData.metadata.page, format },
			},
		}),
		[template, format],
	);

	useEffect(() => {
		let cancelled = false;
		setError(null);
		setPdfBlob(null);

		createResumePdfBlob({ data, template })
			.then((blob) => {
				if (!cancelled) setPdfBlob(blob);
			})
			.catch((err: unknown) => {
				if (!cancelled) setError(err instanceof Error ? err.message : String(err));
			});

		return () => {
			cancelled = true;
		};
	}, [data, template]);

	return (
		<div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 900, margin: "0 auto" }}>
			<h1 style={{ fontSize: 20, fontWeight: 600 }}>Resume Engine Smoke Test (dev only)</h1>
			<p style={{ color: "#666", marginBottom: 16 }}>
				Renders the vendored sample resume via <code>@resume-engine/pdf</code>. Pick a template + page size.
			</p>

			<div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
				<label>
					Template:{" "}
					<select value={template} onChange={(e) => setTemplate(e.target.value as Template)}>
						{TEMPLATES.map((t) => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
				</label>
				<label>
					Page size:{" "}
					<select value={format} onChange={(e) => setFormat(e.target.value as PageFormat)}>
						{PAGE_FORMATS.map((f) => (
							<option key={f} value={f}>
								{f}
							</option>
						))}
					</select>
				</label>
			</div>

			{error ? <p style={{ color: "crimson" }}>Failed to render PDF: {error}</p> : null}

			{pdfBlob ? (
				<PdfCanvasDocument file={pdfBlob} onLoadSuccess={() => {}}>
					{(doc) => (
						<div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
							{Array.from({ length: doc.numPages }, (_, index) => (
								<PdfCanvasPage
									key={index}
									document={doc}
									pageNumber={index + 1}
									pageScale={1}
									totalPages={doc.numPages}
									showPageNumbers
									onLoadSuccess={() => {}}
								/>
							))}
						</div>
					)}
				</PdfCanvasDocument>
			) : !error ? (
				<p>Rendering PDF…</p>
			) : null}
		</div>
	);
}
