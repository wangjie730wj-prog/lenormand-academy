import { Suspense } from "react";
import PersonalCasesClient from "./personal-cases-client";

function PersonalCasesFallback() {
  return <div className="container">加载中...</div>;
}

export default function PersonalCasesPage() {
  return (
    <Suspense fallback={<PersonalCasesFallback />}>
      <PersonalCasesClient />
    </Suspense>
  );
}
