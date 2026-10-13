"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Search, Plus, Calendar, MapPin, Phone, Users, CheckCircle, Clock, X, Sparkles } from "lucide-react";
import { formatINR } from "@/lib/utils";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Modal
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Form State: DEFAULT IS CUSTOM CUSTOMER (Point 6)
  const [useExistingCustomer, setUseExistingCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customCustomerName, setCustomCustomerName] = useState("");
  const [customCustomerPhone, setCustomCustomerPhone] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [eventName, setEventName] = useState("");
  const [quantityJars, setQuantityJars] = useState("25");
  const [ratePerJarRupees, setRatePerJarRupees] = useState("35");
  const [depositAmountRupees, setDepositAmountRupees] = useState("1000");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
    ])
      .then(([ordData, custData]) => {
        setOrders(ordData.orders || []);
        setCustomers(custData.customers || []);
        if (custData.customers?.length > 0 && !selectedCustomerId) {
          const first = custData.customers[0];
          setSelectedCustomerId(first.id);
          const rate = Math.round((first.pricePerJarPaise ?? first.customPrice?.pricePerJarPaise ?? 3500) / 100);
          setRatePerJarRupees(rate.toString());
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load orders:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        orderType: "ONE_TIME_EVENT",
        quantityJars: Number(quantityJars),
        unitPricePaise: Math.round(Number(ratePerJarRupees) * 100),
        scheduledDate,
        eventName: eventName || "Bulk Event Order",
        depositAmountPaise: Math.round(Number(depositAmountRupees || 0) * 100),
      };

      if (useExistingCustomer) {
        payload.customerId = selectedCustomerId;
        const cust = customers.find((c) => c.id === selectedCustomerId);
        payload.addressId = cust?.addresses?.[0]?.id || "addr_001";
      } else {
        payload.customCustomerName = customCustomerName;
        payload.customCustomerPhone = customCustomerPhone;
        payload.venueAddress = venueAddress;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setAddModalOpen(false);
        setCustomCustomerName("");
        setCustomCustomerPhone("");
        setVenueAddress("");
        setEventName("");
        loadData();
      }
    } catch (err) {
      console.error("Failed to create order:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesType = typeFilter === "ALL" || o.orderType === typeFilter;
    const matchesSearch =
      searchTerm === "" ||
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
              Bulk & Event Orders
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Event & Bulk Orders Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage weddings, functions, ad-hoc orders, and security deposits
          </p>
        </div>

        <button
          onClick={() => {
            setUseExistingCustomer(false);
            setAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Book Event / Bulk Order</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Order #, Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold w-full sm:w-auto">
          {["ALL", "ONE_TIME_EVENT", "RECURRING"].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                typeFilter === type
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {type === "ALL" ? "All Orders" : type === "ONE_TIME_EVENT" ? "Events" : "Daily Runs"}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map((ord) => (
          <div
            key={ord.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {ord.orderNumber}
                  </span>
                  <h3 className="font-black text-slate-900 text-base mt-1">{ord.customerName}</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                  {ord.status}
                </span>
              </div>

              <div className="py-3 space-y-1.5 text-xs text-slate-600">
                <p className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Delivery Date: <strong>{ord.scheduledDate}</strong></span>
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{ord.streetAddress}, {ord.locality}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{ord.customerPhone}</span>
                </p>
              </div>

              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Quantity</span>
                  <span className="text-sm font-black text-slate-900">{ord.quantityJars} Jars</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Order Total</span>
                  <span className="text-sm font-black text-slate-900">{formatINR(ord.totalAmountPaise)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: BOOK EVENT / BULK ORDER (DEFAULT: CUSTOM CUSTOMER) */}
      {/* ========================================================================= */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                  New Booking
                </span>
                <h3 className="text-base font-black text-slate-900">Book Event / Bulk Order</h3>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              {/* Toggle: Use existing vs Default Custom Customer */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700">Select pre-registered customer?</span>
                <input
                  type="checkbox"
                  checked={useExistingCustomer}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseExistingCustomer(checked);
                    if (checked && selectedCustomerId) {
                      const cust = customers.find((c) => c.id === selectedCustomerId);
                      if (cust) {
                        const rate = Math.round((cust.pricePerJarPaise ?? cust.customPrice?.pricePerJarPaise ?? 3500) / 100);
                        setRatePerJarRupees(rate.toString());
                      }
                    }
                  }}
                  className="w-4 h-4 rounded text-amber-600 cursor-pointer"
                />
              </div>

              {/* DEFAULT: CUSTOM CUSTOMER FIELDS */}
              {!useExistingCustomer ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Customer / Host Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Verma Family / Royal Banquet"
                      value={customCustomerName}
                      onChange={(e) => setCustomCustomerName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Contact Mobile Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9811223344"
                      value={customCustomerPhone}
                      onChange={(e) => setCustomCustomerPhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Delivery Venue / Address *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hotel Anand Lawn, Rampur Garden"
                      value={venueAddress}
                      onChange={(e) => setVenueAddress(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Choose Customer:</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedCustomerId(newId);
                      const cust = customers.find((c) => c.id === newId);
                      if (cust) {
                        const rate = Math.round((cust.pricePerJarPaise ?? cust.customPrice?.pricePerJarPaise ?? 3500) / 100);
                        setRatePerJarRupees(rate.toString());
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.customerCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Event Occasion / Name</label>
                <input
                  type="text"
                  placeholder="e.g. Wedding Reception, Birthday Party"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity (Jars) *</label>
                  <input
                    type="number"
                    min="1"
                    value={quantityJars}
                    onChange={(e) => setQuantityJars(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Rate (₹ / Jar) *</label>
                  <input
                    type="number"
                    value={ratePerJarRupees}
                    onChange={(e) => setRatePerJarRupees(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Date *</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Security Deposit (₹)</label>
                  <input
                    type="number"
                    value={depositAmountRupees}
                    onChange={(e) => setDepositAmountRupees(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black text-amber-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {isSubmitting ? "Booking..." : "Confirm Event Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
