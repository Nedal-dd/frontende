import "./online.css";
import { resolveAvatarSrc, DEFAULT_AVATAR_URL } from "../../utils/image";
export default function Online({ user, avatarUrl }) {


  return (
    <li className="rightbarFriend">
      <div className="rightbarProfileImgContainer">
        <img className="rightbarFriendImg" src={avatarUrl || (resolveAvatarSrc(user?.profilePictureUrl || user?.profilePicture) || DEFAULT_AVATAR_URL) } alt="" onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR_URL)} />
        <span className="rightbarOnline"></span>
      </div>
        <span className="rightbarUsername">{user?.username ?? "User"}</span>
    </li>
  );
}
