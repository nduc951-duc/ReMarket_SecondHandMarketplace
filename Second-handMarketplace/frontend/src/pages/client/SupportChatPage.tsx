import ChatPage from '@/pages/client/ChatPage';

function SupportChatPage() {
  const supportReceiverId = String(import.meta.env.VITE_SUPPORT_USER_ID || '').trim();

  return (
    <ChatPage
      defaultReceiverId={supportReceiverId}
      disableProductCard
      headerLabel="Hỗ trợ khách hàng"
    />
  );
}

export default SupportChatPage;
