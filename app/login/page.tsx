import LoginPage from "@/components/LoginPage/LoginPage";
import { Suspense } from "react";

const page = () => {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
};

export default page;
