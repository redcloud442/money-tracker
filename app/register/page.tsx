import RegisterPage from "@/components/RegisterPage/RegisterPage";
import { Suspense } from "react";

const page = () => {
  return (
    <Suspense>
      <RegisterPage />
    </Suspense>
  );
};

export default page;
