import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";

export function BasicInfoSection() {
  const { fullName, email, phone, location, linkedin, portfolio, github, setBasicInfo } = useCvBuilderStore();

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setBasicInfo("fullName", e.target.value)} placeholder="Nguyen Van A" />
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setBasicInfo("email", e.target.value)} placeholder="nguyenvana@email.com" />
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input id="phone" value={phone} onChange={(e) => setBasicInfo("phone", e.target.value)} placeholder="0901234567" />
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={location} onChange={(e) => setBasicInfo("location", e.target.value)} placeholder="Ho Chi Minh City, Vietnam" />
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="linkedin">LinkedIn URL</Label>
          <Input id="linkedin" value={linkedin} onChange={(e) => setBasicInfo("linkedin", e.target.value)} placeholder="linkedin.com/in/nguyenvana" />
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="github">GitHub / Behance</Label>
          <Input id="github" value={github} onChange={(e) => setBasicInfo("github", e.target.value)} placeholder="github.com/nguyenvana" />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="portfolio">Portfolio URL</Label>
          <Input id="portfolio" value={portfolio} onChange={(e) => setBasicInfo("portfolio", e.target.value)} placeholder="yourportfolio.com" />
        </div>
      </div>
    </div>
  );
}
