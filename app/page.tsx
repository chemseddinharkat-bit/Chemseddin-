"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function App() {
  const [tab, setTab] = useState<"customer" | "driver" | "owner">("customer");
  const [menu, setMenu] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [orderSent, setOrderSent] = useState(false);

  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverPrice, setDriverPrice] = useState("150");
  const [currentDriver, setCurrentDriver] = useState<any>(null);

  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("بيتزا");
  const [newItemPrice, setNewItemPrice] = useState("");

  const fetchData = async () => {
    const { data: menuData } = await supabase.from("menu_items").select("*").order("created_at");
    const { data: driversData } = await supabase.from("drivers").select("*").order("created_at");
    const { data: ordersData } = await supabase.from("orders").select("*, drivers(full_name, phone)").order("created_at", { ascending: false });

    if (menuData) setMenu(menuData);
    if (driversData) {
      setDrivers(driversData);
      if (currentDriver) {
        const updated = driversData.find((d) => d.id === currentDriver.id);
        if (updated) setCurrentDriver(updated);
      }
    }
    if (ordersData) setOrders(ordersData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [currentDriver?.id]);

  const foodTotal = menu.reduce((sum, item) => sum + (cart[item.id] || 0) * Number(item.price), 0);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const orderedItems = menu
      .filter((item) => (cart[item.id] || 0) > 0)
      .map((item) => ({ name: item.name, qty: cart[item.id], price: item.price }));

    if (orderedItems.length === 0) return alert("يرجى اختيار وجبة واحدة على الأقل!");
    if (!selectedDriver) return alert("يرجى اختيار عامل توصيل متوفر!");

    const { error } = await supabase.from("orders").insert({
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      items: orderedItems,
      food_total: foodTotal,
      delivery_price: Number(selectedDriver.delivery_price),
      driver_id: selectedDriver.id,
      status: "pending",
    });

    if (!error) {
      setOrderSent(true);
      setCart({});
      fetchData();
      setTimeout(() => setOrderSent(false), 5000);
    } else {
      alert("حدث خطأ أثناء إرسال الطلب: " + error.message);
    }
  };

  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: existing } = await supabase.from("drivers").select("*").eq("phone", driverPhone).single();

    if (existing) {
      setCurrentDriver(existing);
    } else {
      const { data: created, error } = await supabase
        .from("drivers")
        .insert({ full_name: driverName, phone: driverPhone, delivery_price: Number(driverPrice), is_available: true })
        .select()
        .single();
      if (created) setCurrentDriver(created);
      if (error) alert("خطأ في التسجيل: " + error.message);
    }
    fetchData();
  };

  const toggleDriverAvailability = async () => {
    if (!currentDriver) return;
    const newStatus = !currentDriver.is_available;
    await supabase.from("drivers").update({ is_available: newStatus }).eq("id", currentDriver.id);
    setCurrentDriver({ ...currentDriver, is_available: newStatus });
    fetchData();
  };

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;
    await supabase.from("menu_items").insert({
      name: newItemName,
      category: newItemCategory,
      price: Number(newItemPrice),
      available: true,
    });
    setNewItemName("");
    setNewItemPrice("");
    fetchData();
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    fetchData();
  };

  const availableDrivers = drivers.filter((d) => d.is_available);

  return (
    <div dir="rtl" className="min-h-screen bg-neutral-950 text-neutral-100 font-sans pb-16">
      <header className="bg-amber-600 text-white p-4 shadow-lg sticky top-0 z-20">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">🍕 بيتزا هاوس - طلب وتوصيل</h1>
          <span className="text-xs bg-black/30 px-2 py-1 rounded-full">مباشر</span>
        </div>
        <div className="max-w-xl mx-auto grid grid-cols-3 gap-2 mt-3 bg-amber-700/60 p-1 rounded-xl text-sm font-semibold">
          <button
            onClick={() => setTab("customer")}
            className={`py-2 rounded-lg transition ${tab === "customer" ? "bg-white text-amber-700 shadow" : "text-white"}`}
          >
            🛒 الزبون
          </button>
          <button
            onClick={() => setTab("driver")}
            className={`py-2 rounded-lg transition ${tab === "driver" ? "bg-white text-amber-700 shadow" : "text-white"}`}
          >
            🛵 عامل التوصيل
          </button>
          <button
            onClick={() => setTab("owner")}
            className={`py-2 rounded-lg transition ${tab === "owner" ? "bg-white text-amber-700 shadow" : "text-white"}`}
          >
            👨‍🍳 المحل ({orders.filter((o) => o.status === "pending").length})
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4">
        {loading && <p className="text-center text-neutral-400 py-10">جاري تحميل القائمة...</p>}

        {!loading && tab === "customer" && (
          <div className="space-y-6">
            {orderSent && (
              <div className="bg-emerald-600 text-white p-4 rounded-xl text-center font-bold shadow-lg">
                ✅ تم إرسال طلبك بنجاح إلى المحل وعامل التوصيل! سيتصل بك قريباً.
              </div>
            )}

            <section>
              <h2 className="text-lg font-bold mb-3 text-amber-400">1. اختر وجباتك</h2>
              <div className="space-y-3">
                {menu.map((item) => (
                  <div key={item.id} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="text-xs text-amber-500 font-semibold">{item.category}</span>
                      <h3 className="font-bold text-base">{item.name}</h3>
                      <p className="text-emerald-400 font-bold text-sm">{item.price} دج</p>
                    </div>
                    <div className="flex items-center gap-3 bg-neutral-800 px-3 py-1.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setCart({ ...cart, [item.id]: Math.max(0, (cart[item.id] || 0) - 1) })}
                        className="text-lg font-bold text-amber-500 px-1"
                      >
                        -
                      </button>
                      <span className="font-bold w-4 text-center">{cart[item.id] || 0}</span>
                      <button
                        type="button"
                        onClick={() => setCart({ ...cart, [item.id]: (cart[item.id] || 0) + 1 })}
                        className="text-lg font-bold text-emerald-400 px-1"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3 text-amber-400">2. اختر عامل التوصيل المتوفر حالياً</h2>
              {availableDrivers.length === 0 ? (
                <p className="bg-neutral-900 p-4 rounded-xl text-sm text-neutral-400 border border-neutral-800">
                  لا يوجد عمال توصيل متوفرون حالياً. يرجى المحاولة بعد قليل.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {availableDrivers.map((driver) => (
                    <div
                      key={driver.id}
                      onClick={() => setSelectedDriver(driver)}
                      className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition ${
                        selectedDriver?.id === driver.id
                          ? "bg-amber-600/20 border-amber-500"
                          : "bg-neutral-900 border-neutral-800"
                      }`}
                    >
                      <div>
                        <p className="font-bold">🛵 {driver.full_name}</p>
                        <p className="text-xs text-neutral-400">📞 {driver.phone}</p>
                      </div>
                      <div className="text-left">
                        <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full font-bold">
                          التوصيل: {driver.delivery_price} دج
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <form onSubmit={handleOrder} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-3">
              <h2 className="text-lg font-bold text-amber-400">3. معلومات التوصيل</h2>
              <input
                required
                type="text"
                placeholder="الاسم الكامل"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-neutral-800 p-3 rounded-lg text-sm outline-none border border-neutral-700 focus:border-amber-500"
              />
              <input
                required
                type="tel"
                placeholder="رقم الهاتف (ليتصل بك عامل التوصيل)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-neutral-800 p-3 rounded-lg text-sm outline-none border border-neutral-700 focus:border-amber-500"
              />
              <input
                required
                type="text"
                placeholder="العنوان أو الحي بدقة"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full bg-neutral-800 p-3 rounded-lg text-sm outline-none border border-neutral-700 focus:border-amber-500"
              />

              <div className="border-t border-neutral-800 pt-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>مجموع الوجبات:</span>
                  <span>{foodTotal} دج</span>
                </div>
                <div className="flex justify-between">
                  <span>سعر التوصيل:</span>
                  <span>{selectedDriver ? `${selectedDriver.delivery_price} دج` : "0 دج"}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-amber-400 pt-1">
                  <span>المجموع الكلي:</span>
                  <span>{foodTotal + (selectedDriver ? Number(selectedDriver.delivery_price) : 0)} دج</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg transition"
              >
                تأكيد وإرسال الطلب الآن ✅
              </button>
            </form>
          </div>
        )}

        {!loading && tab === "driver" && (
          <div className="space-y-6">
            {!currentDriver ? (
              <form onSubmit={handleDriverLogin} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-3">
                <h2 className="text-lg font-bold text-amber-400">تسجيل / دخول عامل التوصيل</h2>
                <p className="text-xs text-neutral-400">أدخل رقم هاتفك للدخول، أو املأ البيانات للتسجيل لأول مرة.</p>
                <input
                  required
                  type="text"
                  placeholder="الاسم واللقب"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full bg-neutral-800 p-3 rounded-lg text-sm outline-none border border-neutral-700"
                />
                <input
                  required
                  type="tel"
                  placeholder="رقم الهاتف"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full bg-neutral-800 p-3 rounded-lg text-sm outline-none border border-neutral-700"
                />
                <input
                  required
                  type="number"
                  placeholder="سعر التوصيل داخل المدينة (دج)"
                  value={driverPrice}
                  onChange={(e) => setDriverPrice(e.target.value)}
                  className="w-full bg-neutral-800 p-3 rounded-lg text-sm outline-none border border-neutral-700"
                />
                <button type="submit" className="w-full bg-amber-600 py-3 rounded-xl font-bold">
                  دخول / تسجيل كعامل توصيل 🛵
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <h2 className="font-bold text-lg">مرحباً، {currentDriver.full_name}</h2>
                    <p className="text-xs text-neutral-400">تسعيرتك: {currentDriver.delivery_price} دج</p>
                  </div>
                  <button
                    onClick={toggleDriverAvailability}
                    className={`px-4 py-2 rounded-xl font-bold text-sm ${
                      currentDriver.is_available ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    {currentDriver.is_available ? "🟢 متوفر حالياً" : "🔴 غير متوفر"}
                  </button>
                </div>

                <h3 className="font-bold text-amber-400">الطلبات الموجهة إليك:</h3>
                {orders.filter((o) => o.driver_id === currentDriver.id).length === 0 ? (
                  <p className="text-neutral-400 text-sm bg-neutral-900 p-4 rounded-xl">لا توجد طلبات موجهة إليك حالياً.</p>
                ) : (
                  orders
                    .filter((o) => o.driver_id === currentDriver.id)
                    .map((order) => (
                      <div key={order.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-base">👤 {order.customer_name}</span>
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">
                            {order.status === "pending" ? "جديد" : order.status === "delivering" ? "في الطريق" : "مكتمل"}
                          </span>
                        </div>
                        <p className="text-sm">📍 العنوان: <span className="text-neutral-300">{order.customer_address}</span></p>
                        <p className="text-sm">
                          📞 الهاتف:{" "}
                          <a href={`tel:${order.customer_phone}`} className="text-emerald-400 underline font-bold">
                            {order.customer_phone} (اتصل)
                          </a>
                        </p>
                        <div className="text-xs bg-neutral-800 p-2 rounded">
                          {order.items?.map((it: any, idx: number) => (
                            <div key={idx}>• {it.name} × {it.qty}</div>
                          ))}
                        </div>
                        <p className="text-sm font-bold text-amber-400">
                          المبلغ الواجب تحصيله: {Number(order.food_total) + Number(order.delivery_price)} دج (منها {order.delivery_price} دج لك)
                        </p>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => updateOrderStatus(order.id, "delivering")}
                            className="flex-1 bg-blue-600 py-2 rounded-lg text-xs font-bold"
                          >
                            استلمت الطلب وفي الطريق
                          </button>
                          <button
                            onClick={() => updateOrderStatus(order.id, "completed")}
                            className="flex-1 bg-emerald-600 py-2 rounded-lg text-xs font-bold"
                          >
                            تم التسليم ✅
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        )}

        {!loading && tab === "owner" && (
          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-amber-400">📋 الطلبات الواردة للمحل</h2>
              {orders.length === 0 ? (
                <p className="text-neutral-400 text-sm bg-neutral-900 p-4 rounded-xl">لا توجد طلبات حتى الآن.</p>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">زبون: {order.customer_name} ({order.customer_phone})</span>
                      <span className="text-xs bg-amber-600 px-2 py-0.5 rounded-full">{order.status}</span>
                    </div>
                    <p className="text-xs text-neutral-400">📍 {order.customer_address}</p>
                    <p className="text-xs text-emerald-400">
                      🛵 عامل التوصيل المختار: {order.drivers?.full_name} ({order.drivers?.phone})
                    </p>
                    <div className="bg-neutral-800 p-2 rounded text-sm space-y-1">
                      {order.items?.map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span>{it.name} × {it.qty}</span>
                          <span>{it.price * it.qty} دج</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-bold text-sm pt-1">
                      <span>مستحقات المحل: {order.food_total} دج</span>
                      <span>التوصيل: {order.delivery_price} دج</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, "preparing")}
                        className="flex-1 bg-amber-600 py-1.5 rounded text-xs font-bold"
                      >
                
