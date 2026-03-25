import PersonalCasesClient from "./personal-cases-client";

type PersonalCasesPageProps = {
  searchParams?: Promise<{
    filter?: string;
    mode?: string;
    highlight?: string;
  }>;
};

export default async function PersonalCasesPage({ searchParams }: PersonalCasesPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <PersonalCasesClient
      initialFilter={params.filter}
      initialMode={params.mode}
      initialHighlightId={params.highlight}
    />
  );
}
