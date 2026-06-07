import GuideBrowser from "./GuideBrowser";

function GuidesTab({ appId }: { appId: string | undefined }) {
  return <GuideBrowser appId={appId} />;
}

export default GuidesTab;
