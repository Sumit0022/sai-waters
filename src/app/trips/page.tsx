"use client";

import { useEffect, useState } from "react";
import { Truck, MapPin, Users, CheckCircle, Clock, Plus, Phone, Calendar, ArrowRight, X } from "lucide-react";
import { formatINR } from "@/lib/utils";

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Trip Modal
  const [newTripModalOpen, setNewTripModalOpen] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("UP 25 AB 4590");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/trips").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
    ])
      .then(([tripData, ordData]) => {
        setTrips(tripData.trips || []);
        // filter unassigned or confirmed orders
        setOrders(ordData.orders?.filter((o: any) => o.status === "CONFIRMED") || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load trips:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: "usr_driver_01",
          vehicleNumber,
          orderIds: selectedOrderIds,
        }),
      });
      if (res.ok) {
        setNewTripModalOpen(false);
        setSelectedOrderIds([]);
        loadData();
      }
    } catch (err) {
      console.error("Failed to create trip:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleOrderSelection = (id: string) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter((item) => item !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Logistics & Trip Sheets Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Trip sheet generation, vehicle routing, driver assignments, and delivery stop verification
          </p>
        </div>

        <button
          onClick={() => setNewTripModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Trip Sheet
        </button>
      </div>

      {/* Trips List */}
      <div className="space-y-4">
        {trips.map((trip) => (
          <div
            key={trip.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{trip.tripSheetNumber}</h3>
                  <p className="text-xs text-slate-500">
                    Driver: <strong className="text-slate-800">{trip.driverName}</strong> ({trip.driverPhone}) • Vehicle: <strong className="text-slate-800">{trip.vehicleNumber}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  {trip.status}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {trip.completedStops} / {trip.totalStops} Stops Done
                </span>
              </div>
            </div>

            {/* Stops Checklist */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Assigned Route Stops ({trip.stops?.length || 0})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {trip.stops?.map((stop: any) => (
                  <div
                    key={stop.dispatchId}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-start">
                      <strong className="text-slate-900 font-extrabold block">{stop.customerName}</strong>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          stop.status === "DELIVERED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {stop.status}
                      </span>
                    </div>

                    <p className="text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {stop.streetAddress}, {stop.locality}
                    </p>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 font-bold">
                      <span className="text-slate-700">Delivery: {stop.quantityJars} Jars</span>
                      <span className="text-sky-600">{formatINR(stop.totalAmountPaise)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Trip Sheet Modal */}
      {newTripModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Create Daily Trip Sheet</h3>
              <button onClick={() => setNewTripModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Vehicle Registration #</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Orders for Route:</label>
                {orders.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                    No confirmed unassigned orders found for today.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {orders.map((ord) => (
                      <label
                        key={ord.id}
                        className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(ord.id)}
                          onChange={() => toggleOrderSelection(ord.id)}
                        />
                        <span className="flex-1 truncate">
                          {ord.customerName} ({ord.quantityJars} Jars)
                        </span>
                        <span className="text-sky-600 font-bold">{formatINR(ord.totalAmountPaise)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewTripModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {isSubmitting ? "Creating..." : "Dispatch Route"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
