import { ReactElement } from "react";
import AuthLayout from "../../components/layout/auth/authLayout";
import DatasetsPage from "../../components/templates/datasets/datasetsPage";
import { GetServerSidePropsContext } from "next";
import { SortDirection } from "../../services/lib/sorts/requests/sorts";

interface DatasetsProps {
  currentPage: number;
  pageSize: number;
  sort: {
    sortKey: string | null;
    sortDirection: SortDirection | null;
    isCustomProperty: boolean;
  };
  defaultIndex: number;
}

const Datasets = (props: DatasetsProps) => {
  const { currentPage, pageSize, sort, defaultIndex } = props;
  return (
    <>
      <DatasetsPage
        currentPage={currentPage}
        pageSize={pageSize}
        sort={sort}
        defaultIndex={defaultIndex}
      />
    </>
  );
};

Datasets.getLayout = function getLayout(page: ReactElement) {
  return <AuthLayout>{page}</AuthLayout>;
};

export default Datasets;

export const getServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const { page, page_size, sortKey, sortDirection, isCustomProperty, tab } =
    context.query;

  const currentPage = parseInt(page as string, 10) || 1;
  const pageSize = parseInt(page_size as string, 10) || 10;

  return {
    props: {
      currentPage,
      pageSize,
      sort: {
        sortKey: sortKey ? (sortKey as string) : null,
        sortDirection: sortDirection ? (sortDirection as SortDirection) : null,
        isCustomProperty: isCustomProperty === "true",
      },
      defaultIndex: tab ? parseInt(tab as string) : 0,
    },
  };
};
