import { Uploader } from "./Uploader";

export default function UploadPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Upload CVs</h1>
        <p className="text-stone-500">
          Pick the role the candidates applied for, then drop in one or many CVs (PDF, DOCX or TXT). Each CV is split into personal details
          (kept private, never sent to AI) and CV content, checked against the five must-haves (Stage 1 screen), scored against both the PM and
          SPM rubric, and ranked. Briefs and email drafts follow automatically.
        </p>
      </div>
      <Uploader />
    </div>
  );
}
