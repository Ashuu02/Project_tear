export default function ResearchPage({ params }: { params: { sessionId: string } }) {
  return <div>Research document viewer · session: {params.sessionId}</div>;
}
