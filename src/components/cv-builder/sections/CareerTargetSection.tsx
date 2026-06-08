import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCvBuilderStore, CareerLevel } from "@/store/useCvBuilderStore";

export function CareerTargetSection() {
  const { targetPosition, careerLevel, industry, setCareerTarget } = useCvBuilderStore();

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="targetPosition">Target Position *</Label>
          <Input id="targetPosition" value={targetPosition} onChange={(e) => setCareerTarget("targetPosition", e.target.value)} placeholder="e.g. Business Analyst Intern" />
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="careerLevel">Career Level *</Label>
          <Select value={careerLevel} onValueChange={(v) => setCareerTarget("careerLevel", v as CareerLevel)}>
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="intern">Intern</SelectItem>
              <SelectItem value="fresher">Fresher</SelectItem>
              <SelectItem value="junior">Junior</SelectItem>
              <SelectItem value="mid-level">Mid-level</SelectItem>
              <SelectItem value="career-switcher">Career Switcher</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" value={industry} onChange={(e) => setCareerTarget("industry", e.target.value)} placeholder="e.g. Software / EdTech" />
        </div>
      </div>
    </div>
  );
}
