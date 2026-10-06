import { ConfigManager } from "@/components/admin/config-manager";
import { getPortalConfig } from "@/lib/server/portal-service";
export default async function Page() {
  const config = await getPortalConfig();
  return (
    <ConfigManager
      section="coverage"
      initialSettings={config.settings}
      initialRates={config.rates}
      initialCoverage={config.coverage}
      ready={config.ready}
      setupError={config.error}
    />
  );
}
