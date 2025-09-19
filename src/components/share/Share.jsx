// src/components/share/Share.jsx
import { useMemo, useState, useEffect } from "react";
import {
  AddPhotoAlternate,
  AddReaction,
  Subtitles,
  AddLocationAlt,
} from "@mui/icons-material";
import "./share.css";
import {  ProfileApi } from "../../api/api";

export default function Share({ addPost }) {
  const [input, setInput] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [feeling, setFeeling] = useState("");
  const [location, setLocation] = useState("");
  const [caption, setCaption] = useState("");

  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [showFeelingInput, setShowFeelingInput] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [photoInputKey, setPhotoInputKey] = useState(Date.now());
  const [profilePicUrl, setProfilePicUrl] = useState("");
    const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await ProfileApi.getMe();
        setProfilePicUrl(
            data.urlProfilePicture?.trim() ? data.urlProfilePicture : "/assets/default-avatar.png"
        );
      } catch {
        setProfilePicUrl("/assets/default-avatar.png");
      }
    })();
  }, []);

  // Live preview URL for the selected image (not uploaded)
  const photoPreview = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile]
  );

  const hideAllInputs = () => {
    setShowPhotoInput(false);
    setShowFeelingInput(false);
    setShowLocationInput(false);
    setShowCaptionInput(false);
  };

  const handlePhotoClick = (e) => {
    e.preventDefault();
    hideAllInputs();
    setShowPhotoInput(true);
    setPhotoInputKey(Date.now());
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]); // preview only
      hideAllInputs();
    }
  };

  const handleFeelingClick = (e) => {
    e.preventDefault();
    hideAllInputs();
    setShowFeelingInput(true);
  };
  const handleLocationClick = (e) => {
    e.preventDefault();
    hideAllInputs();
    setShowLocationInput(true);
  };
  const handleCaptionClick = (e) => {
    e.preventDefault();
    hideAllInputs();
    setShowCaptionInput(true);
  };

  const handleShare = async (e) => {
      console.log("handleShare");
    e.preventDefault();

    // Backend: content is @NotBlank — require it
    if (!input.trim()) {
      alert("Content is required.");
      return;
    }

    // Map empty strings to null so backend doesn’t store empty text
    const dto = {
      content: input.trim(),
      imageUrl: null, // set real URL after you implement upload
      Feeling: feeling.trim() ? feeling.trim() : null,
      Location: location.trim() ? location.trim() : null,
      Caption: caption.trim() ? caption.trim() : null,
    };

      try {
          setBusy(true);
          await addPost(dto); // Parent macht den Request und setzt den State
          // UI reset
          setInput("");
          setPhotoFile(null);
          setFeeling("");
          setLocation("");
          setCaption("");
          hideAllInputs();
      } finally {
          setBusy(false);
      }
  };

  return (
    <div className="share">
      <div className="shareWrapper">
        <div className="shareTop">
          <img className="shareProfileImg" src={profilePicUrl} alt="Profile"
               onError={(e) => (e.currentTarget.src = "/assets/default-avatar.png")}
          />
          <input
            placeholder="What's on your mind?"
            className="shareInput"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

        {/* --- Live Preview (shows before sending) --- */}
        {(photoPreview || feeling || location || caption) && (
          <div className="sharePreview">
            {photoPreview && (
              <img
                className="sharePreviewImg"
                src={photoPreview}
                alt="preview"
              />
            )}
            <div className="sharePreviewMeta">
              <div>
                <strong>Feeling:</strong> {feeling || "—"}
              </div>
              <div>
                <strong>Location:</strong> {location || "—"}
              </div>
              <div>
                <strong>Caption:</strong> {caption || "—"}
              </div>
            </div>
          </div>
        )}

        <hr className="shareHr" />

        <form className="shareBottom" onSubmit={handleShare}>
          <div className="shareOptions">
            <div className="shareOption" onClick={handlePhotoClick}>
              <AddPhotoAlternate htmlColor="chocolate" className="shareIcon" />
              <span className="shareOptionText">Photo</span>
            </div>
            <div className="shareOption" onClick={handleFeelingClick}>
              <AddReaction htmlColor="#F1A438" className="shareIcon" />
              <span className="shareOptionText">Feeling</span>
            </div>
            <div className="shareOption" onClick={handleLocationClick}>
              <AddLocationAlt
                htmlColor="DarkOliveGreen"
                className="shareIcon"
              />
              <span className="shareOptionText">Location</span>
            </div>
            <div className="shareOption" onClick={handleCaptionClick}>
              <Subtitles htmlColor="mediumPurple" className="shareIcon" />
              <span className="shareOptionText">Caption</span>
            </div>
            <button className="shareButton" type="submit">
              Share
            </button>
          </div>

          {showPhotoInput && (
            <input
              type="file"
              accept="image/*"
              className="shareFileInputHidden"
              onChange={handlePhotoChange}
              key={photoInputKey}
              ref={(input) => input && input.click()}
            />
          )}

          {showFeelingInput && (
            <input
              type="text"
              placeholder="How are you feeling?"
              value={feeling}
              onChange={(e) => setFeeling(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && hideAllInputs()}
              onBlur={hideAllInputs}
              className="shareInputField"
              autoFocus
            />
          )}

          {showLocationInput && (
            <input
              type="text"
              placeholder="Where are you?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && hideAllInputs()}
              onBlur={hideAllInputs}
              className="shareInputField"
              autoFocus
            />
          )}

          {showCaptionInput && (
            <input
              type="text"
              placeholder="Add a caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && hideAllInputs()}
              onBlur={hideAllInputs}
              className="shareInputField"
              autoFocus
            />
          )}
        </form>
      </div>
    </div>
  );
}
