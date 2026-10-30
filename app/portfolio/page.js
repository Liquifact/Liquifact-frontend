import PortfolioDashboard from "./PortfolioDashboard.jsx";

export const metadata = {
  title: "Investor portfolio",
  robots: { index: false, follow: false },
};

export default async function PortfolioPage({ searchParams }) {
  const params = await searchParams;
  return <PortfolioDashboard demo={params?.demo === "1"} />;
}
