import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSeconds } from "@/lib/sql/timeHelpers";
import { useLocalStorage } from "@/services/hooks/localStorage";
import { BarChart, Card } from "@tremor/react";
import { useState } from "react";
import {
  useSessionMetrics,
  useSessionNames,
} from "../../../services/hooks/sessions";
import { Row } from "../../layout/common";
import { Col } from "../../layout/common/col";
import LoadingAnimation from "../../shared/loadingAnimation";
import { formatLargeNumber } from "../../shared/utils/numberFormat";

import { TimeFilter } from "@/types/timeFilter";
import { Responsive, ResponsiveProps, WidthProvider } from "react-grid-layout";
import { INITIAL_LAYOUT, MD_LAYOUT, SMALL_LAYOUT } from "./gridLayouts";
type SessionResult = ReturnType<typeof useSessionNames>["sessions"][number];

const ResponsiveGridLayout = WidthProvider(Responsive) as React.ComponentType<
  ResponsiveProps & { children?: React.ReactNode }
>;

interface SessionMetricsProps {
  selectedSession: SessionResult | null;
  timeFilter: TimeFilter;
}

interface ChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  category: string;
  color: string;
  valueFormatter: (value: number) => string;
  isLoading: boolean;
  xAxisLabel: string;
}

const gridCols = { lg: 12, md: 12, sm: 12, xs: 4, xxs: 2 };

const Chart: React.FC<ChartProps> = ({
  title,
  data,
  category,
  color,
  valueFormatter,
  isLoading,
  xAxisLabel,
  subtitle,
}) => (
  <Card>
    <p className="text-sm text-slate-500">{title}</p>
    {subtitle && (
      <p className="text-xl font-semibold text-slate-950 dark:text-slate-50">
        {subtitle}
      </p>
    )}
    {isLoading ? (
      <div className="h-64">
        <LoadingAnimation height={200} width={200} />
      </div>
    ) : (
      <BarChart
        data={data}
        index="range"
        categories={[category]}
        colors={[color]}
        valueFormatter={valueFormatter}
        yAxisWidth={100}
        showLegend={false}
        showXAxis={true}
        xAxisLabel={xAxisLabel}
        className="h-80 p-5"
      />
    )}
  </Card>
);

const SessionMetrics = ({
  selectedSession,
  timeFilter,
}: SessionMetricsProps) => {
  const [pSize, setPSize] = useLocalStorage<
    "p50" | "p75" | "p95" | "p99" | "p99.9"
  >("session-details-pSize", "p75");
  const [useInterquartile, setUseInterquartile] = useState(false);

  const { metrics, isLoading } = useSessionMetrics(
    selectedSession?.name ?? "",
    pSize,
    useInterquartile,
    timeFilter,
  );

  return (
    <Col className="space-y-4">
      <div className="space-y-2 border-b border-slate-200 px-4 pb-4 dark:border-slate-800">
        <Label
          htmlFor="percentile-select"
          className="text-slate-500 dark:text-slate-500"
        >
          Select Percentile
        </Label>
        <Row className="items-center gap-2">
          <Select
            onValueChange={(value) =>
              setPSize(value as "p50" | "p75" | "p95" | "p99" | "p99.9")
            }
            value={pSize}
          >
            <SelectTrigger id="percentile-select" className="w-full">
              <SelectValue placeholder="Percentile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="p50">p50</SelectItem>
              <SelectItem value="p75">p75</SelectItem>
              <SelectItem value="p95">p95</SelectItem>
              <SelectItem value="p99">p99</SelectItem>
              <SelectItem value="p99.9">p99.9</SelectItem>
            </SelectContent>
          </Select>
          <Row className="items-center gap-2">
            <Checkbox
              checked={useInterquartile}
              onCheckedChange={(checked) =>
                setUseInterquartile(checked as boolean)
              }
              className="flex h-3 w-3 items-center justify-center border-slate-500 text-slate-500 data-[state=checked]:border-[#0ca5ea] data-[state=checked]:bg-[#0ca5ea] dark:border-slate-500 dark:text-slate-500"
              iconClassName="w-2 h-2"
            />
            <Label className="text-xs font-medium leading-none text-slate-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-slate-500">
              Interquartile
            </Label>
          </Row>
        </Row>
      </div>

      <ResponsiveGridLayout
        className="layout px-2"
        layouts={{
          lg: INITIAL_LAYOUT,
          md: MD_LAYOUT,
          sm: MD_LAYOUT,
          xs: SMALL_LAYOUT,
          xxs: SMALL_LAYOUT,
        }}
        autoSize={true}
        isBounded={true}
        isDraggable={false}
        breakpoints={{ lg: 1200, md: 996, sm: 600, xs: 360, xxs: 0 }}
        cols={gridCols}
        rowHeight={96}
        resizeHandles={["e", "w"]}
      >
        <div key="requests-count-distribution">
          <Chart
            title="Requests count distribution"
            subtitle={getSubtitle(
              isLoading,
              metrics?.average.session_count[0]?.average,
              "requests / session",
              2,
            )}
            data={(metrics?.session_count || []).map((sessionCount) => {
              const start = Math.ceil(Number(sessionCount.range_start ?? 0));
              const end = Math.floor(Number(sessionCount.range_end ?? 0));
              return {
                range: start === end ? `${start}` : `${start}-${end}`,
                count: Math.round(sessionCount.value),
              };
            })}
            category="count"
            color="blue"
            valueFormatter={(value) =>
              `${formatLargeNumber(value, true)} sessions`
            }
            isLoading={isLoading}
            xAxisLabel="Requests per session"
          />
        </div>
        <div key="cost-distribution">
          <Chart
            title="Cost distribution"
            subtitle={getSubtitle(
              isLoading,
              metrics?.average.session_cost[0]?.average,
              " / session",
              5,
              "$",
            )}
            data={(metrics?.session_cost || []).map((sessionCost) => {
              const start = Number(sessionCost.range_start ?? 0);
              const end = Number(sessionCost.range_end ?? 0);
              return {
                range:
                  start === end
                    ? `$${formatLargeNumber(start)}`
                    : `$${formatLargeNumber(start)}-$${formatLargeNumber(end)}`,
                cost: Math.round(sessionCost.value),
              };
            })}
            category="cost"
            color="green"
            valueFormatter={(value) =>
              `${formatLargeNumber(value, true)} sessions`
            }
            isLoading={isLoading}
            xAxisLabel="Cost per session"
          />
        </div>
        <div key="duration-distribution">
          <Chart
            title="Duration distribution"
            subtitle={getSubtitle(
              isLoading,
              metrics?.average.session_duration[0]?.average,
              "seconds / session",
              3,
            )}
            data={(metrics?.session_duration || []).map((sessionDuration) => {
              const start = Math.round(
                Number(sessionDuration.range_start ?? 0),
              );
              const end = Math.round(Number(sessionDuration.range_end ?? 0));
              return {
                range:
                  start === end
                    ? formatSeconds(start)
                    : `${formatSeconds(start)}-${formatSeconds(end)}`,
                duration: Math.round(sessionDuration.value),
              };
            })}
            category="duration"
            color="purple"
            valueFormatter={(value) =>
              `${formatLargeNumber(value, true)} sessions`
            }
            isLoading={isLoading}
            xAxisLabel="Duration per session"
          />
        </div>
      </ResponsiveGridLayout>
    </Col>
  );
};

export default SessionMetrics;

const getSubtitle = (
  isLoading: boolean,
  averageMetric: number | undefined,
  unit: string,
  toFixedValue: number,
  prefix: string = "",
) => {
  if (isLoading) {
    return "Loading...";
  }
  if (averageMetric === undefined) {
    return `Average: N/A ${unit}`;
  }
  return `Average: ${prefix}${averageMetric.toFixed(toFixedValue)} ${unit}`;
};
