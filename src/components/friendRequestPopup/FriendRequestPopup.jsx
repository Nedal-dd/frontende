import "./FriendRequestPopup.css";

export default function FriendRequestPopup({ user, onClose, onSend }) {
  return (
    <div className="friendRequestPopup">
      <p>
        Send friend request to <strong>{user.username}</strong>?
      </p>
      <div className="popupActions">
        <button className="sendBtn" onClick={() => onSend(user.id)}>
          Send
        </button>
        <button className="cancelBtn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
