import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import Feed from "../../components/feed/Feed";
import Rightbar from "../../components/rightbar/Rightbar";
import "./home.css";
import { Users } from "../../dummyData"; // assuming Users has profile info, etc.
import { useEffect, useState } from "react";

export default function Home() {
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768) {
        setShowSidebarMenu(false); // Menü schließen, wenn wieder groß
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return (
    <>
      <Topbar onHamburgerClick={() => setShowSidebarMenu((p) => !p)} />

      <div className="homeContainer">
        <div className="sidebar">
          <Sidebar />
        </div>
        <Feed />
        <div className="rightbar">
          <Rightbar />
        </div>
      </div>

      {/* Hamburger Menü Overlay */}
      {showSidebarMenu && (
        // alert(showSidebarMenu),
        <div
          className="sidebarMenuOverlay"
          onClick={() => setShowSidebarMenu(false)}
        >
          <div
            className="sidebarMenuPanel"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar />
            <Rightbar />
          </div>
        </div>
      )}
    </>
  );
}
