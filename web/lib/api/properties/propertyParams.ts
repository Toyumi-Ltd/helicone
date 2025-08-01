import { FilterLeaf, FilterNode } from "@helicone-package/filters/filterDefs";
import { buildFilterWithAuthClickHouseProperties } from "@helicone-package/filters/filters";
import { Result } from "@/packages/common/result";
import { dbQueryClickhouse } from "../db/dbExecute";

export interface PropertyParam {
  property_param: string;
  property_key: string;
}

function getFilterSearchFilterNode(
  property: string,
  search: string,
): FilterNode {
  const propertyFilter: FilterLeaf = {
    properties_v3: {
      key: {
        equals: property,
      },
    },
  };
  if (search === "") {
    return propertyFilter;
  }
  const searchFilter: FilterLeaf = {
    properties_v3: {
      value: {
        contains: search,
      },
    },
  };
  return {
    left: propertyFilter,
    right: searchFilter,
    operator: "and",
  };
}

export async function getPropertyParams(
  org_id: string,
  property: string,
  search: string,
): Promise<Result<PropertyParam[], string>> {
  const builtFilter = await buildFilterWithAuthClickHouseProperties({
    org_id,
    filter: getFilterSearchFilterNode(property, search),
    argsAcc: [],
  });

  const query = `
  SELECT distinct key as property_key, value as property_param
  from properties_v3
  where (
    ${builtFilter.filter}
  )
  limit 100
`;

  const { data, error } = await dbQueryClickhouse<PropertyParam>(
    query,
    builtFilter.argsAcc,
  );

  if (error !== null) {
    return { data: null, error: error };
  }
  return { data: data, error: null };
}
