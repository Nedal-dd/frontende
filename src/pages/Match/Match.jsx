import "./match.css";
import Sidebar from "../../components/sidebar/Sidebar";
import Topbar from "../../components/topbar/Topbar";
import MatchContainer from "../../components/match-container/MatchContainer";

export default function Match() {
  return (
    <>
      <Topbar />
      <div className="homeContainer">
        <Sidebar />
        <MatchContainer />
      </div>
    </>
  );
}
