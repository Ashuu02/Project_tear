export default function PipelinePage({ params }: { params: { sessionId: string } }) {
  return <div>Pipeline — Live agent feed · session: {params.sessionId}</div>;
}
