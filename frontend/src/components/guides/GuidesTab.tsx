import { useState } from "react";
import type { GuideWithOwner } from "../../api/types";
import GuideBrowser from "./GuideBrowser";
import GuideViewer from "./GuideViewer";

type GuidesTabProps = {
  appId: string | undefined;
  initialGuideId?: number;
};

function GuidesTab({ appId, initialGuideId }: GuidesTabProps) {
  const [selectedGuide, setSelectedGuide] = useState<GuideWithOwner | null>(null);

  if (selectedGuide) {
    return (
      <GuideViewer
        guide={selectedGuide}
        appId={appId}
        onBack={() => setSelectedGuide(null)}
      />
    );
  }

  return <GuideBrowser appId={appId} onReadGuide={setSelectedGuide} initialGuideId={initialGuideId} />;
}

export default GuidesTab;
