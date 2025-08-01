// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import {
  HandlerWrapperOptions,
  withAuth,
} from "../../../lib/api/handlerWrappers";
import {
  getLatencyOverTime,
  LatencyOverTime,
} from "../../../lib/api/metrics/getLatencyOverTime";
import { Result } from "@/packages/common/result";
import { MetricsBackendBody } from "../../../services/hooks/useBackendFunction";

async function handler(
  options: HandlerWrapperOptions<Result<LatencyOverTime[], string>>,
) {
  const {
    req,
    res,
    userData: { orgId },
  } = options;
  const {
    timeFilter,
    filter: userFilters,
    dbIncrement,
    timeZoneDifference,
  } = options.req.body as MetricsBackendBody;

  const resp = await getLatencyOverTime({
    timeFilter,
    userFilter: userFilters,
    orgId,
    dbIncrement: dbIncrement ?? "hour",
    timeZoneDifference,
  });

  res.status(200).json(resp);
}

export default withAuth(handler);
