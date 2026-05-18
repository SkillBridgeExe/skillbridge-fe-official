import { useNavigate } from "react-router-dom";

export default function MentorPackages() {
  const navigate = useNavigate();

  const packages = [
    {
      title: "Basic Session",
      duration: "30 Minutes",
      price: "$10",
      description: "Quick mentoring session to solve specific problems or get quick advice.",
    },
    {
      title: "Standard Session",
      duration: "1 Hour",
      price: "$18",
      description: "In-depth discussion about your learning path, projects, or career advice.",
      popular: true,
    },
    {
      title: "Premium Session",
      duration: "2 Hours",
      price: "$30",
      description: "Extended mentoring session including project review and career guidance.",
    },
  ];

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      
      {/* Page Title */}
      <h1 style={{ textAlign: "center", marginBottom: "10px" }}>
        Choose a Mentoring Package
      </h1>

      <p style={{ textAlign: "center", marginBottom: "40px", color: "gray" }}>
        Select a session that best fits your learning needs.
      </p>

      {/* Packages */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "25px",
          maxWidth: "1000px",
          margin: "auto",
        }}
      >
        {packages.map((pkg, index) => (
          <div
            key={index}
            style={{
              border: pkg.popular ? "2px solid #4f46e5" : "1px solid #ddd",
              borderRadius: "10px",
              padding: "25px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
              position: "relative",
              background: "white",
            }}
          >
            {pkg.popular && (
              <span
                style={{
                  position: "absolute",
                  top: "-10px",
                  right: "15px",
                  background: "#4f46e5",
                  color: "white",
                  padding: "5px 10px",
                  fontSize: "12px",
                  borderRadius: "6px",
                }}
              >
                Most Popular
              </span>
            )}

            <h2>{pkg.title}</h2>

            <p style={{ color: "gray", margin: "10px 0" }}>
              Duration: {pkg.duration}
            </p>

            <h3 style={{ margin: "15px 0" }}>{pkg.price}</h3>

            <p style={{ fontSize: "14px", color: "#555" }}>
              {pkg.description}
            </p>

            <button
              onClick={() => navigate("/payment")}
              style={{
                marginTop: "20px",
                width: "100%",
                padding: "10px",
                border: "none",
                borderRadius: "6px",
                background: "#4f46e5",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Book This Session
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}