import { useEffect, useRef, useState, useMemo } from "react";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import { ProfileApi, AuthApi } from "../../api/api";
import { AddPhotoAlternate } from "@mui/icons-material";
import "./profile.css";
import { resolveAvatarSrc, DEFAULT_AVATAR_URL } from "../../utils/image";

/** Local enum mappers (UI <-> backend enums) */
const toPetEnum = (v) =>
  ({ Dog: "DOG", Cat: "CAT", Bird: "BIRD", Other: "OTHER" }[v] || "OTHER");

const fromPetEnum = (e) =>
  ({ DOG: "Dog", CAT: "Cat", BIRD: "Bird", OTHER: "Other" }[e] || "Other");

const toLookingEnum = (v) =>
  ({
    Playdates: "PLAYDATES",
    Training: "TRAINING",
    Sitting: "SITTING",
    Meetups: "MEETUPS",
  }[v] || "PLAYDATES");

const fromLookingEnum = (e) =>
  ({
    PLAYDATES: "Playdates",
    TRAINING: "Training",
    SITTING: "Sitting",
    MEETUPS: "Meetups",
  }[e] || "Playdates");

export default function Profile() {
  const [form, setForm] = useState({
    username: "",
    bio: "",
    location: "",
    petTypeUi: "Dog",
    lookingForUi: "Playdates",
    topics: "",
    days: "",
    allowMessagesUi: "yes",
    urlProfilePicture: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const photoInputRef = useRef(null);

  // Live preview for selected image file
  const photoPreview = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile]
  );
    useEffect(() => {
        return () => {
            if (photoPreview) URL.revokeObjectURL(photoPreview);
        };
    }, [photoPreview]);


    useEffect(() => {

        console.log("into useEffect");
    (async () => {
      setLoading(true);
      try {
        const { data: user } = await AuthApi.me();
        var x = user.username.split("@")[0];
        console.log("Username:::::", x);
        const { data: profile } = await ProfileApi.getMe();
        console.log("Profile data:", profile.urlProfilePicture);
        setForm((f) => ({
          ...f,
          username: x,
          bio: profile?.bio ?? "",
          location: profile?.location ?? "",
          petTypeUi: fromPetEnum(profile?.petType),
          lookingForUi: fromLookingEnum(profile?.lookingFor),
          topics: profile?.topics ?? "",
          days: profile?.days ?? "",
          allowMessagesUi: profile?.allowMessages ? "yes" : "no",
            urlProfilePicture: profile?.urlProfilePicture ?? "",
        }));
        console.log("Form data:", form);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Handle file selection
  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
      console.log("Selected photo file:", e.target.files[0]);
      setShowPhotoInput(false);
    }
  };

  // Simulate upload and get URL (replace with real upload logic)
  const uploadPhotoAndGetUrl = async (file) => {
    // TODO: Replace with real upload logic (e.g., upload to S3 or backend)
    // For now, just return a fake URL after a short delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(URL.createObjectURL(file));
      }, 800);
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

      let urlProfilePicture = (form.urlProfilePicture || "").trim();
      console.log("Uploading picture:", urlProfilePicture);
      if (photoFile) {
          urlProfilePicture = photoFile.name;        // z.B. "1.png"
      }
      if (urlProfilePicture === "") urlProfilePicture = null;


      const dto = {
      bio: form.bio,
      location: form.location,
      petType: toPetEnum(form.petTypeUi),
      lookingFor: toLookingEnum(form.lookingForUi),
      topics: form.topics,
      days: form.days,
        urlProfilePicture,

    };
    try {
      await ProfileApi.updateMe(dto);
      setForm((f) => ({ ...f, urlProfilePicture }));
      setPhotoFile(null);
      alert("Saved.");
    } catch (err) {
      console.error("Save failed:", err);
      alert("Save failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Topbar />
      <div className="homeContainer">
        <Sidebar />

        <div className="profileContainer">
          <h1>Profile of {form.username}</h1>

          <form className="profileForm" onSubmit={onSubmit}>
            <label>
              About me
              <textarea name="bio" value={form.bio} onChange={onChange} />
            </label>

            <label>
              Location
              <input
                name="location"
                value={form.location }
                onChange={onChange}
              />
            </label>

            <div className="profilePhotoSection">
              <label className="profilePhotoLabel" htmlFor="profilePhotoInput">
                Profile picture
              </label>
              <div className="profilePhotoActions">
                <button
                  type="button"
                  className="profilePhotoButton"
                  onClick={() => {
                    setShowPhotoInput(true);
                    if (photoInputRef.current) photoInputRef.current.value = "";
                    photoInputRef.current && photoInputRef.current.click();
                  }}
                >
                  <AddPhotoAlternate style={{ fontSize: 20 }} />
                  Import Photo
                </button>
                <span className="profilePhotoHint">or paste URL below</span>
              </div>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                ref={photoInputRef}
                id="profilePhotoInput"
                name="profilePhotoInput"
                onChange={handlePhotoChange}
              />
              <input
                name="urlProfilePicture"
                value={form.urlProfilePicture}
                onChange={onChange}
                className="profilePhotoUrlInput"
              />
              {(photoPreview || form.urlProfilePicture) && (
                <img
                    src={photoPreview || resolveAvatarSrc(form.urlProfilePicture)}
                  alt="Profile Preview"
                  className="profilePhotoPreview"
                    onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR_URL)}
                />
              )}
            </div>

            <fieldset>
              <legend>Pet type</legend>
              {["Dog", "Cat", "Bird", "Other"].map((v) => (
                <label key={v}>
                  <input
                    type="radio"
                    name="petTypeUi"
                    value={v}
                    checked={form.petTypeUi === v}
                    onChange={onChange}
                  />
                  {v}
                </label>
              ))}
            </fieldset>

            <fieldset>
              <legend>I'm looking for</legend>
              {["Playdates", "Training", "Sitting", "Meetups"].map((v) => (
                <label key={v}>
                  <input
                    type="radio"
                    name="lookingForUi"
                    value={v}
                    checked={form.lookingForUi === v}
                    onChange={onChange}
                  />
                  {v}
                </label>
              ))}
            </fieldset>

            <label>
              Topics (comma separated)
              <input
                name="topics"
                placeholder="e.g., walks, health, events"
                value={form.topics}
                onChange={onChange}
              />
            </label>

            <label>
              Preferred days (comma separated)
              <input
                name="days"
                placeholder="e.g., Mon, Wed, Fri"
                value={form.days}
                onChange={onChange}
              />
            </label>



            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Loading…" : "Save"}
            </button>
          </form>

          <div className="profileCard">
            <h2>Preview</h2>
            {(photoPreview || form.urlProfilePicture) && (
              <img

                src={photoPreview || form.urlProfilePicture}

                alt="Profile"
                className="profilePhotoPreview"
                style={{ marginBottom: 10 }}
              />
            )}
            <p>
              <b>About:</b> {form.bio || "—"}
            </p>
            <p>
              <b>Location:</b> jetzt {form.location || "—"}
            </p>
            <p>
              <b>Pet type:</b> {form.petTypeUi}
            </p>
            <p>
              <b>Looking for:</b> {form.lookingForUi}
            </p>
            <p>
              <b>Topics:</b> {form.topics || "—"}
            </p>
            <p>
              <b>Days:</b> {form.days || "—"}
            </p>
            <p>
              <b>Messages allowed:</b>{" "}
              {form.allowMessagesUi === "yes" ? "Yes" : "No"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
