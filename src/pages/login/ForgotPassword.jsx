import { useState } from "react";
import { AuthApi } from "../../api/api";

export default function ForgotPassword() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [pwd, setPwd] = useState("");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");

    const sendCode = async (e) => {
        console.log("sendCode" , e);
        e?.preventDefault();
        setMsg("");
        setErr("");
        setLoading(true);
        try {
            await AuthApi.forgotPasswordStart(email.trim());
            setMsg("If the email exists, a code has been sent. Please check your inbox.");
            setStep(2);
        } catch (ex) {
            setErr(ex.response?.data || "Failed to send the code.");
        } finally {
            setLoading(false);
        }
    };

    const verifyAndReset = async (e) => {
        e?.preventDefault();
        setMsg("");
        setErr("");
        setLoading(true);
        try {
            await AuthApi.forgotPasswordVerify({
                email: email.trim(),
                code: code.trim(),
                newPassword: pwd,
            });
            setMsg("Password changed successfully. You can now log in.");
            setStep(1);
            setCode("");
            setPwd("");

        }
        catch (ex) {
            const serverMsg =
                ex?.response?.data?.message ||
                (typeof ex?.response?.data === "string" ? ex.response.data : null) ||
                ex?.message ||
                "Invalid code or reset failed.";
            setErr(serverMsg);
        }

        finally {
            setLoading(false);
        }
    };

    const goToLogin = (e) => {
        e?.preventDefault();
        window.location.href = "/login";
    };

    return (
        <section className="login-wrapper">
            {step === 1 && (
                <form onSubmit={sendCode}>
                    <h1>Forgot Password</h1>
                    {msg && <div className="dialog-row">{msg}</div>}
                    {err && <div className="dialog-row redText">{err}</div>}
                    <div className="inputbox">
                        <input
                            type="email"
                            required
                            value={email}

                            onChange={(e) => {
                                {console.log("e ist : " , e)}
                                return setEmail(e.target.value) ;}
                        }

                        />
                        <label>Email</label>
                    </div>
                    <button type="submit" disabled={loading} >
                        {loading ? "Sending..." : "Send code"}
                    </button>

                    <div style={{ marginTop: 12 }}>
                        <a href="/login" onClick={goToLogin}>
                            Back to login
                        </a>
                    </div>
                </form>
            )}

            {step === 2 && (
                <form onSubmit={verifyAndReset}>
                    <h1>Verify Code & Set Password</h1>
                    {msg && <div className="dialog-row">{msg}</div>}
                    {err && <div className="dialog-row redText">{err}</div>}

                    <div className="inputbox">
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <label>Email</label>
                    </div>

                    <div className="inputbox">
                        <input
                            type="text"
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            maxLength={6}
                        />
                        <label>6-digit code</label>
                    </div>

                    <div className="inputbox">
                        <input
                            type="password"
                            required
                            value={pwd}
                            onChange={(e) => setPwd(e.target.value)}
                        />
                        <label>New password</label>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            disabled={loading}
                        >
                            Back
                        </button>

                        <button type="submit" disabled={loading}>
                            {loading ? "Verifying..." : "Change password"}
                        </button>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <a href="/login" onClick={goToLogin}>
                            Back to login
                        </a>
                    </div>
                </form>
            )}

            {/* After a successful reset the msg shows; link below helps user go back to login */}
            {msg && (
                <div style={{ marginTop: 14 }}>
                    <a href="/login" onClick={goToLogin}>
                        Back to login
                    </a>
                </div>
            )}
        </section>
    );
}
