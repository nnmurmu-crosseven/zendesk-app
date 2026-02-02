export const PatientCard = ({ patient }: { patient: Record<string, any> }) => {
  const piiValues = [
    patient.phone ?? "Phone unavailable",
    patient.email ?? "Email unavailable",
    patient.age ? `${patient.age} Yrs` : "Age unavailable",
    patient.city && patient.state
      ? `${patient.city}, ${patient.state}`
      : "Location unavailable",
  ]

  return (
    <div class="card patient-card">
      <div class="card-title">Patient Details</div>

      <div class="pii-content">
        {piiValues.map((val) => (
          <div class="pii-row">
            <span class="pii-value">{val}</span>
            <button class="copy-btn" type="button">
              ⎘
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
