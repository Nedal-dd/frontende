import "./rightbar.css";
import { Link } from "react-router-dom";
import { Users, matchRequests } from "../../dummyData";
import Online from "../online/Online";

export default function Rightbar() {
  const loggedInUser = {
    id: 999,
    petType: "Dog",
  };

  const suggested = matchRequests
    .filter(
      (req) =>
        req.userId !== loggedInUser.id && req.petType === loggedInUser.petType
    )
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  return (
    <div className="rightbar">
      <div className="rightbarWrapper">
        <h4 className="rightbarTitle">Find a Match!</h4>
        <p className="rightbarText">
          Looking for other pet owners with similar interests or needs? Try our
          matching feature!
        </p>
        <Link to="/match" className="rightbarMatchButton">
          Go to Matching Page
        </Link>

        <div className="rightbarSuggestions">
          <h4 className="rightbarTitle">Suggested Matches</h4>
          <ul>
            {suggested.map((req) => {
              const user = Users.find((u) => u.id === req.userId);
              return (
                <li key={req.id}>
                  🐾 {user?.username} ({req.description})
                </li>
              );
            })}
          </ul>
        </div>

        <hr className="sidebarHr" />
        <h4 className="rightbarTitle">Online Friends</h4>
        <ul className="rightbarFriendList">
          {Users.map((u) => (
            <Online key={u.id} user={u} />
          ))}
        </ul>
      </div>
    </div>
  );
}
