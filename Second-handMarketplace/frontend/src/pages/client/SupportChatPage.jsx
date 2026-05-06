import ChatPage from './ChatPage';

function SupportChatPage() {
  const supportReceiverId = String(import.meta.env.VITE_SUPPORT_USER_ID || '').trim();

  return (
    <ChatPage
      defaultReceiverId={supportReceiverId}
      disableProductCard
      headerLabel="Ho tro khach hang"
    />
  );
}

export default SupportChatPage;
