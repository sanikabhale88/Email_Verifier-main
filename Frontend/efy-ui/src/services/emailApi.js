const BASE_URL = import.meta.env.VITE_API_URL || "http://178.104.66.33:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("efy_token") || sessionStorage.getItem("efy_token");
  return {
    "Content-Type": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` })
  };
};

export const validateSingleEmail = async (email) => {
  const res = await fetch(`${BASE_URL}/validate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ email }),
  });

  return res.json();
};

export const validateMultipleEmails = async (emails) => {
  const res = await fetch(`${BASE_URL}/validate/multiple`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ emails }),
  });

  return res.json();
};
