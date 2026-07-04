import type { ResumePreviewProps } from "./preview.shared";
import { lazy, Suspense, useEffect, useState } from "react";
import { useResumeData } from "./builder-stub";
import { getResumePreviewPageCount, normalizeResumePreviewProps, ResumePreviewLoader } from "./preview.shared";

const ResumePreviewClient = lazy(() =>
	import("./preview.browser").then((module) => ({ default: module.ResumePreviewClient })),
);

// DIVERGENCE (README-VENDOR.txt): RR's `useIsClient` comes from usehooks-ts.
// One-line hook — inlined instead of adding the dependency for a single hook.
function useIsClient() {
	const [isClient, setIsClient] = useState(false);
	useEffect(() => setIsClient(true), []);
	return isClient;
}

export type { ResumePreviewProps };

export function ResumePreview(props: ResumePreviewProps) {
	const isClient = useIsClient();
	const resolvedProps = normalizeResumePreviewProps(props);
	const builderResumeData = useResumeData();
	const resumeData = resolvedProps.data ?? builderResumeData;
	const pageCount = getResumePreviewPageCount(resumeData);

	if (!isClient) return null;

	return (
		<Suspense
			fallback={
				<ResumePreviewLoader
					pageCount={pageCount}
					pageClassName={resolvedProps.pageClassName}
					pageGap={resolvedProps.pageGap}
					pageLayout={resolvedProps.pageLayout}
					pageScale={resolvedProps.pageScale}
					showPageNumbers={resolvedProps.showPageNumbers}
				/>
			}
		>
			<ResumePreviewClient {...resolvedProps} />
		</Suspense>
	);
}
