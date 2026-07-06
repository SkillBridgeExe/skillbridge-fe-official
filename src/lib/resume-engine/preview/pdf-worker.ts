const PDF_WORKER_CACHE_KEY = "mjs-mime-20260706";

export const withPdfWorkerCacheKey = (workerSrc: string) => {
	const url = new URL(workerSrc);
	url.searchParams.set("v", PDF_WORKER_CACHE_KEY);
	return url.toString();
};
