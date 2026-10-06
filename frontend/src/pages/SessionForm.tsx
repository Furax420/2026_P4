import { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent, JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../services/api";
import { authService } from "../services/auth.service";
import type { Teacher, Session, SessionFormData } from "../types";

// The empty option belongs to the form, not to the API payload.
interface SessionFormValues extends Omit<SessionFormData, "teacherId"> {
  teacherId: number | "";
}

function SessionForm(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<SessionFormValues>({
    name: "",
    date: "",
    description: "",
    teacherId: "",
  });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const user = authService.getCurrentUser();
  const isAdmin = user?.admin === true;
  const token = authService.getToken();

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      navigate("/sessions");
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;

    const controller = new AbortController();
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    setError("");

    const loadTeachers = async (): Promise<void> => {
      try {
        const response = await api.get<Teacher[]>("/teacher", {
          headers,
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setTeachers(response.data);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch teachers", err);
      }
    };

    const loadSession = async (): Promise<void> => {
      try {
        const response = await api.get<Session>(`/session/${id}`, {
          headers,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const session = response.data;
        setFormData({
          name: session.name,
          date: new Date(session.date).toISOString().split("T")[0],
          description: session.description,
          teacherId: session.teacher.id,
        });
      } catch (err: unknown) {
        if (controller.signal.aborted) return;

        setError("Failed to load session");
        console.error(err);
      }
    };

    void loadTeachers();

    if (id) {
      void loadSession();
    } else {
      // Clear previous values when opening the creation form.
      setFormData({
        name: "",
        date: "",
        description: "",
        teacherId: "",
      });
    }

    // Cancel both requests when leaving or changing the session.
    return () => controller.abort();
  }, [id, token, isAdmin]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ): void => {
    const { name, value } = e.target;
    if (name === "teacherId") {
      setFormData({
        ...formData,
        teacherId: value === "" ? "" : Number(value),
      });
    } else if (name === "name" || name === "date" || name === "description") {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");
    if (formData.teacherId === "") {
      setError("Please select a teacher");
      return;
    }
    const data: SessionFormData = {
      ...formData,
      teacherId: formData.teacherId,
    };
    setLoading(true);

    try {
      if (isEditMode) {
        await api.put(`/session/${id}`, data, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        await api.post("/session", data, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      navigate("/sessions");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to save session"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">
            {isEditMode ? "Edit Session" : "Create New Session"}
          </h1>

          {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Session Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Teacher
              </label>
              <select
                name="teacherId"
                value={formData.teacherId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                required
              >
                <option value="">Select a teacher</option>
                {teachers.map(
                  (teacher): JSX.Element => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loading
                  ? "Saving..."
                  : isEditMode
                    ? "Update Session"
                    : "Create Session"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/sessions")}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SessionForm;
