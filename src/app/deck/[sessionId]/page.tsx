export default function DeckPage({ params }: { params: { sessionId: string } }) {
  return <div>Deck builder · session: {params.sessionId}</div>;
}
