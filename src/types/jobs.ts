// ─── Business Jobs — Shared Types ───────────────────────────────────
// Mirror of backend DTOs from docs/FE-business-jobs-api-map.md.
// FE-only; never import from backend directly.

// ── Scalar aliases ──────────────────────────────────────────────────
export type UUID = string;
export type ISODateTime = string;

// ── Enums ───────────────────────────────────────────────────────────
export type JobStatus = "draft" | "active" | "closed" | "expired" | "removed";
export type ApplicationMode = "NATIVE" | "EXTERNAL";
export type WorkMode = "ONSITE" | "HYBRID" | "REMOTE";
export type EmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "INTERNSHIP"
  | "CONTRACT"
  | "FREELANCE";
export type ExperienceLevel =
  | "INTERN"
  | "FRESHER"
  | "JUNIOR"
  | "MIDDLE"
  | "SENIOR"
  | "LEAD";
export type SalaryPeriod = "MONTH" | "YEAR";
export type BusinessProfileStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED";
export type JobVersionStatus = "DRAFT" | "PUBLISHED" | "SUPERSEDED";
export type ApplicationStatus =
  | "SUBMITTED"
  | "IN_REVIEW"
  | "SHORTLISTED"
  | "REJECTED"
  | "WITHDRAWN";
export type MatchStatus = "PENDING" | "READY" | "FAILED";
export type JobSourceType = "employer" | "scraped" | "imported" | "feed";
export type CompanyType =
  | "PRODUCT"
  | "OUTSOURCING"
  | "CONSULTING"
  | "STARTUP"
  | "OTHER";
export type CompanySize =
  | "1_10"
  | "11_50"
  | "51_100"
  | "101_300"
  | "301_500"
  | "501_1000"
  | "1000_PLUS";
export type SkillImportance = "REQUIRED" | "NICE_TO_HAVE";
export type SkillSource = "AUTO" | "BUSINESS";
export type ReportReasonCode =
  | "SCAM"
  | "MISLEADING"
  | "DISCRIMINATION"
  | "EXPIRED"
  | "OTHER";
export type ReportStatus = "OPEN" | "DISMISSED" | "ACTIONED";

// ── Pagination ──────────────────────────────────────────────────────
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ── Shared DTOs ─────────────────────────────────────────────────────
export interface SalaryDto {
  visible: boolean;
  min: number | null;
  max: number | null;
  currency: string;
  period: SalaryPeriod | null;
  negotiable: boolean;
}

export interface CompanySummaryDto {
  id: UUID;
  slug: string;
  name: string;
  logoUrl: string | null;
}

export interface JobLocationDto {
  cityCode: string;
  countryCode: string;
  addressLine: string;
  isPrimary: boolean;
}

export interface JobSkillDto {
  skillId: UUID;
  canonicalName: string;
  importance: SkillImportance;
  minLevel: 1 | 2 | 3 | 4 | 5 | null;
  source: SkillSource;
  confidence: number | null;
  rawText: string | null;
}

// ── Public Job ──────────────────────────────────────────────────────
export interface PublicJobContentDto {
  summary: string | null;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  interviewProcess: string[];
  workingTime: string | null;
  locations: JobLocationDto[];
  educationLevel: string | null;
  languageCode: string | null;
}

export interface PublicJobDto {
  id: UUID;
  slug: string;
  title: string;
  roleCode: string | null;
  company: CompanySummaryDto;
  location: string | null;
  cityCodes: string[];
  workMode: WorkMode | null;
  employmentType: EmploymentType | null;
  experienceLevel: ExperienceLevel | null;
  openingsCount: number;
  salary: SalaryDto;
  applicationMode: ApplicationMode;
  canApply: boolean;
  sourceUrl: string | null;
  currentVersionId: UUID | null;
  postedAt: ISODateTime | null;
  expiresAt: ISODateTime | null;
  content: PublicJobContentDto | null;
}

// ── Public Company ──────────────────────────────────────────────────
export interface PublicCompanyDto {
  id: UUID;
  slug: string;
  name: string;
  website: string | null;
  linkedinUrl: string | null;
  industryCode: string | null;
  companyType: CompanyType | null;
  companySize: CompanySize | null;
  foundedYear: number | null;
  countryCode: string;
  headquartersCityCode: string | null;
  headquartersAddress: string | null;
  shortDescription: string | null;
  description: string | null;
  cultureDescription: string | null;
  benefits: string[];
  logoUrl: string | null;
  coverUrl: string | null;
}

// ── Job Match ───────────────────────────────────────────────────────
export interface JobMatchResult {
  matched_skills: Array<Record<string, unknown>>;
  partial_skills: Array<Record<string, unknown>>;
  missing_skills: Array<Record<string, unknown>>;
  bonus_skills: Array<Record<string, unknown>>;
  unnormalized_cv_skills: Array<Record<string, unknown>>;
  unnormalized_jd_requirements: Array<Record<string, unknown>>;
  match_ratio: number;
  required_coverage: number;
  overall_score: number;
  requirements_source: "jd_extraction" | "role_rubric" | "none";
  rubric_band: string | null;
  scoring_breakdown: Record<string, number>;
  inferred_skills: Array<Record<string, unknown>>;
}

// ── Saved Jobs ──────────────────────────────────────────────────────
export interface SavedJobRow {
  id: UUID;
  userId: UUID;
  jobId: UUID;
  createdAt: ISODateTime;
}

export interface SavedJobDto {
  id: UUID;
  slug: string;
  title: string;
  roleCode: string | null;
  location: string | null;
  cityCodes: string[];
  workMode: WorkMode | null;
  employmentType: EmploymentType | null;
  experienceLevel: ExperienceLevel | null;
  salary: SalaryDto;
  applicationMode: ApplicationMode;
  canApply: boolean;
  sourceUrl: string | null;
  currentVersionId: UUID | null;
  postedAt: ISODateTime | null;
  expiresAt: ISODateTime | null;
}

export interface SavedJobItem {
  savedAt: ISODateTime;
  job: SavedJobDto;
}

// ── Applications ────────────────────────────────────────────────────
export interface CvSkillSnapshotDto {
  skillId: UUID;
  canonicalName: string;
  displayName: string;
}

export interface ApplicationMatchSkillDto {
  canonicalName: string;
  displayName: string;
  importance: string | null;
  cvLevel: number | null;
  requiredLevel: number | null;
}

export interface ApplicationMatchExplanationDto {
  status: MatchStatus;
  score: number | null;
  scoringVersion: string | null;
  scoreBasis: string | null;
  requirementsSource: string | null;
  requiredCoverage: number | null;
  errorCode: string | null;
  matchedSkills: ApplicationMatchSkillDto[];
  partialSkills: ApplicationMatchSkillDto[];
  missingSkills: ApplicationMatchSkillDto[];
}

export interface JobApplicationDto {
  id: UUID;
  jobId: UUID;
  jobVersionId: UUID;
  candidateUserId: UUID;
  sourceCvId: UUID | null;
  status: ApplicationStatus;
  coverNote: string | null;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  consentVersion: string;
  consentAcceptedAt: ISODateTime;
  cvOriginalFileName: string | null;
  cvContentType: string | null;
  cvFileSize: number | null;
  cvKind: string | null;
  cvSkillsSnapshot: CvSkillSnapshotDto[];
  matchStatus: MatchStatus;
  matchScore: string | null;
  matchScoringVersion: string | null;
  matchResult: JobMatchResult | null;
  matchComputedAt: ISODateTime | null;
  matchErrorCode: string | null;
  matchExplanation: ApplicationMatchExplanationDto;
  firstViewedAt: ISODateTime | null;
  submittedAt: ISODateTime;
  withdrawnAt: ISODateTime | null;
  terminalAt: ISODateTime | null;
  piiPurgeAfter: ISODateTime | null;
  piiPurgedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime | null;
  /** Included by the candidate application list for dashboard rendering. */
  job?: {
    id: UUID;
    slug: string;
    title: string;
    companyName: string | null;
    location: string | null;
  } | null;
}

export interface CandidateApplicationEventDto {
  id: UUID;
  applicationId: UUID;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  actorUserId: UUID | null;
  notificationType: "NONE" | "NEW_APPLICATION" | "APPLICATION_STATUS_CHANGED";
  notificationStatus: "NOT_REQUIRED" | "PENDING" | "SENT" | "FAILED";
  notificationAttemptCount: number;
  notificationNextAttemptAt: ISODateTime | null;
  notificationSentAt: ISODateTime | null;
  notificationErrorCode: string | null;
  createdAt: ISODateTime;
}

export interface BusinessApplicationEventDto extends CandidateApplicationEventDto {
  internalNote: string | null;
}

// ── Filter ──────────────────────────────────────────────────────────
export interface FilterCount {
  value: string;
  count: number;
}

export interface JobFiltersResponse {
  roleCodes: FilterCount[];
  cityCodes: FilterCount[];
  workModes: FilterCount[];
  employmentTypes: FilterCount[];
  experienceLevels: FilterCount[];
}

// ── Business Profile / Company Entity ───────────────────────────────
export interface BusinessProfileDto {
  id: UUID;
  userId: UUID;
  companyId: UUID;
  status: BusinessProfileStatus;
  contactName: string | null;
  contactPhone: string | null;
  workEmail: string | null;
  workEmailNormalized: string | null;
  workEmailDomain: string | null;
  workEmailVerifiedAt: ISODateTime | null;
  submittedAt: ISODateTime | null;
  reviewedAt: ISODateTime | null;
  reviewedByUserId: UUID | null;
  rejectionReason: string | null;
  suspensionReason: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime | null;
}

export interface CompanyEntityDto {
  id: UUID;
  name: string;
  nameNormalized: string;
  slug: string;
  canonicalCompanyId: UUID | null;
  website: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  linkedinUrl: string | null;
  industryCode: string | null;
  companyType: CompanyType | null;
  companySize: CompanySize | null;
  foundedYear: number | null;
  countryCode: string;
  headquartersCityCode: string | null;
  headquartersAddress: string | null;
  shortDescription: string | null;
  description: string | null;
  cultureDescription: string | null;
  benefits: string[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime | null;
}

export interface BusinessCompanyAggregate {
  profile: BusinessProfileDto;
  company: CompanyEntityDto;
}

// ── Job Entity / Version (Business) ─────────────────────────────────
export interface JobEntityDto {
  id: UUID;
  companyId: UUID;
  createdByUserId: UUID | null;
  slug: string;
  title: string;
  roleCode: string | null;
  location: string | null;
  employmentType: EmploymentType | null;
  experienceLevel: ExperienceLevel | null;
  salaryMin: string | null;
  salaryMax: string | null;
  currency: string;
  status: JobStatus;
  sourceType: JobSourceType;
  sourceName: string | null;
  sourceUrl: string | null;
  externalId: string | null;
  contentHash: string | null;
  canonicalJobId: UUID | null;
  currentPublishedVersionId: UUID | null;
  applicationMode: ApplicationMode;
  workMode: WorkMode | null;
  primaryCityCode: string | null;
  locationCityCodes: string[];
  salaryPeriod: SalaryPeriod | null;
  salaryVisible: boolean;
  salaryNegotiable: boolean;
  openingsCount: number;
  minYearsExperience: string | null;
  maxYearsExperience: string | null;
  postedAt: ISODateTime | null;
  lastSeenAt: ISODateTime | null;
  expiresAt: ISODateTime | null;
  closedAt: ISODateTime | null;
  removedAt: ISODateTime | null;
  removedByUserId: UUID | null;
  removalReason: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime | null;
}

export interface JobVersionDto {
  id: UUID;
  jobId: UUID;
  versionNo: number;
  status: JobVersionStatus;
  revision: number;
  createdByUserId: UUID | null;
  title: string;
  roleCode: string | null;
  employmentType: EmploymentType | null;
  experienceLevel: ExperienceLevel | null;
  minYearsExperience: string | null;
  maxYearsExperience: string | null;
  workMode: WorkMode | null;
  openingsCount: number;
  salaryMin: string | null;
  salaryMax: string | null;
  currency: string;
  salaryPeriod: SalaryPeriod | null;
  salaryVisible: boolean;
  salaryNegotiable: boolean;
  educationLevel: string | null;
  languageCode: string | null;
  applicationDeadline: ISODateTime | null;
  summary: string | null;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  interviewProcess: string[];
  workingTime: string | null;
  locations: JobLocationDto[];
  skills: JobSkillDto[];
  skillsConfirmedAt: ISODateTime | null;
  publishedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime | null;
}

// ── Job Reports ─────────────────────────────────────────────────────
export interface JobReportDto {
  id: UUID;
  jobId: UUID;
  reporterUserId: UUID;
  reasonCode: ReportReasonCode;
  details: string | null;
  status: ReportStatus;
  resolvedByUserId: UUID | null;
  resolutionNote: string | null;
  resolvedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime | null;
}

// ── Query types ─────────────────────────────────────────────────────
export interface PublicJobsQuery {
  q?: string;
  roleCodes?: string[];
  cityCodes?: string[];
  workModes?: WorkMode[];
  employmentTypes?: EmploymentType[];
  experienceLevels?: ExperienceLevel[];
  skillIds?: UUID[];
  salaryMin?: number;
  source?: "ALL" | "NATIVE" | "EXTERNAL";
  companySlug?: string;
  sort?: "NEWEST" | "RELEVANCE" | "SALARY_DESC";
  page?: number;
  limit?: number;
}

export interface BusinessJobsQuery {
  q?: string;
  status?: JobStatus;
  page?: number;
  limit?: number;
}

export interface BusinessApplicationsQuery {
  status?: ApplicationStatus;
  pipeline?: "ACTIVE";
  search?: string;
  sort?: "NEWEST" | "OLDEST" | "MATCH_DESC";
  page?: number;
  limit?: number;
}

export type BusinessProfileBlocker =
  | "PROFILE_SUSPENDED"
  | "WORK_EMAIL_UNVERIFIED"
  | "CONTACT_NAME_MISSING"
  | "COMPANY_NAME_MISSING"
  | "WEBSITE_MISSING"
  | "WORK_EMAIL_DOMAIN_MISMATCH"
  | "INDUSTRY_MISSING"
  | "SHORT_DESCRIPTION_MISSING";

export interface BusinessDashboardResponse {
  company: {
    profileId: UUID;
    companyId: UUID;
    name: string;
    slug: string;
    logoUrl: string | null;
    status: BusinessProfileStatus;
    publishAllowed: boolean;
    blockers: BusinessProfileBlocker[];
  } | null;
  metrics: {
    activeJobs: number;
    totalApplications: number;
    submitted: number;
    inReview: number;
    shortlisted: number;
  };
  recentApplications: Array<
    JobApplicationDto & {
      job: Pick<JobEntityDto, "id" | "title" | "slug" | "status"> | null;
    }
  >;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// ── Request types ───────────────────────────────────────────────────
export interface ApplyToJobRequest {
  jobVersionId: UUID;
  cvId: UUID;
  coverNote?: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  consentAccepted: true;
  consentVersion: string;
}

export interface ReportJobRequest {
  reasonCode: ReportReasonCode;
  details?: string;
}

export interface UpdateBusinessCompanyRequest {
  companyName?: string;
  website?: string | null;
  workEmail?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  linkedinUrl?: string | null;
  industryCode?: string | null;
  companyType?: CompanyType | null;
  companySize?: CompanySize | null;
  foundedYear?: number | null;
  countryCode?: string;
  headquartersCityCode?: string | null;
  headquartersAddress?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  cultureDescription?: string | null;
  benefits?: string[];
}

export interface CreateJobDraftRequest {
  title: string;
  roleCode?: string;
}

export interface UpdateJobDraftRequest {
  expectedRevision: number;
  title?: string;
  roleCode?: string | null;
  employmentType?: EmploymentType | null;
  experienceLevel?: ExperienceLevel | null;
  minYearsExperience?: number | null;
  maxYearsExperience?: number | null;
  workMode?: WorkMode | null;
  openingsCount?: number;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  salaryPeriod?: SalaryPeriod | null;
  salaryVisible?: boolean;
  salaryNegotiable?: boolean;
  educationLevel?: string | null;
  languageCode?: string | null;
  applicationDeadline?: ISODateTime | null;
  summary?: string | null;
  responsibilities?: string[];
  requirements?: string[];
  niceToHave?: string[];
  benefits?: string[];
  interviewProcess?: string[];
  workingTime?: string | null;
  locations?: JobLocationDto[];
}

export interface ReplaceDraftSkillsRequest {
  expectedRevision: number;
  skills: JobSkillDto[];
}

export interface UpdateApplicationStatusRequest {
  expectedStatus: ApplicationStatus;
  status: "IN_REVIEW" | "SHORTLISTED" | "REJECTED";
  internalNote?: string;
}

export interface ReviewBusinessRequest {
  status: "VERIFIED" | "REJECTED" | "SUSPENDED";
  reason?: string;
}

export interface ResolveJobReportRequest {
  status: "DISMISSED" | "ACTIONED";
  resolutionNote?: string;
}

export interface RemoveJobRequest {
  status: "removed";
  reason: string;
}

// ── Response types ──────────────────────────────────────────────────
export interface CreateJobDraftResponse {
  job: JobEntityDto;
  draft: JobVersionDto;
}

export interface BusinessJobDetailResponse {
  job: JobEntityDto;
  draft: JobVersionDto | null;
  published: JobVersionDto | null;
  publishReadiness: JobPublishReadiness;
}

/** Backend-owned publishing gate. Keep its shape exact so unknown blockers stay visible. */
export interface JobPublishReadiness {
  ready: boolean;
  blockers: Array<{
    code: string;
    field: string;
    message: string;
  }>;
}

export interface PublishJobResponse {
  job: JobEntityDto;
  published: JobVersionDto;
}

export interface CandidateApplicationDetailResponse {
  application: JobApplicationDto;
  events: CandidateApplicationEventDto[];
}

export interface BusinessApplicationDetailResponse {
  application: JobApplicationDto;
  events: BusinessApplicationEventDto[];
}

export interface CompanyMediaUploadResponse {
  kind: "logo" | "cover";
  url: string;
}

export interface AdminBusinessProfilesQuery {
  status?: BusinessProfileStatus;
  page?: number;
  limit?: number;
}

export interface AdminJobReportsQuery {
  status?: ReportStatus;
  page?: number;
  limit?: number;
}
