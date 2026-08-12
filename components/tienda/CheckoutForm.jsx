"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/CartProvider";
import { useZonasEnvio } from "@/lib/useZonasEnvio";
import { useMetodosPago } from "@/lib/useMetodosPago";
import { useTiendaConfig } from "@/lib/useTiendaConfig";
import { validateCheckoutForm, calculateTotal, calculateDiscount, validateMinimoViandas, resolveEnvioGratis, resolveDescuentoCantidad } from "@/lib/checkout";
import { submitOrder } from "@/lib/submitOrder";
import { buildOrderEmailParams, sendOrderConfirmationEmail } from "@/lib/emailNotifications";
import RepartoInfo from "./RepartoInfo";
import styles from "./CheckoutForm.module.css";

const INITIAL_CLIENTE = { nombre: "", telefono: "", email: "", direccion: "" };

export default function CheckoutForm() {
  const searchParams = useSearchParams();
  const zonaFromCart = searchParams.get("zona") || "";
  const { cart, subtotal, clearCart } = useCart();
  const { zonasEnvio } = useZonasEnvio();
  const { metodosPago } = useMetodosPago();
  const config = useTiendaConfig();
  const { minimoViandas, descuentosCantidad } = config;

  const [cliente, setCliente] = useState(INITIAL_CLIENTE);
  const [zonaEnvioId, setZonaEnvioId] = useState(zonaFromCart);
  const [metodoPagoId, setMetodoPagoId] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMessage, setErrorMessage] = useState("");
  const [pedidoId, setPedidoId] = useState(null);
  const [numeroPedido, setNumeroPedido] = useState(null);

  const zonasActivas = zonasEnvio.filter((z) => z.activa);
  const metodosActivos = metodosPago.filter((m) => m.activo);
  const zonaSeleccionada = zonasActivas.find((z) => z.id === zonaEnvioId);
  const metodoSeleccionado = metodosActivos.find((m) => m.id === metodoPagoId);
  const costoEnvioBase = zonaSeleccionada ? zonaSeleccionada.costo : 0;
  const { aplica: envioGratisAplica } = resolveEnvioGratis(cart, config);
  const costoEnvio = envioGratisAplica ? 0 : costoEnvioBase;
  const { porcentaje: descuentoCantidadPorcentaje } = resolveDescuentoCantidad(cart, descuentosCantidad);
  const descuentoCantidadMonto = calculateDiscount(subtotal, descuentoCantidadPorcentaje);
  const subtotalPostCantidad = subtotal - descuentoCantidadMonto;
  const descuentoPorcentaje = metodoSeleccionado ? metodoSeleccionado.descuentoPorcentaje : 0;
  const descuentoMetodoPagoMonto = calculateDiscount(subtotalPostCantidad, descuentoPorcentaje);
  const descuentoMonto = descuentoCantidadMonto + descuentoMetodoPagoMonto;
  const total = calculateTotal(subtotal - descuentoMonto, costoEnvio);
  const { valid: minimoOk, faltan } = validateMinimoViandas(cart, minimoViandas);

  const handleChange = (field) => (event) => {
    setCliente((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const data = { ...cliente, zonaEnvioId, metodoPago: metodoPagoId };
    const { valid, errors: validationErrors } = validateCheckoutForm(data);
    setErrors(validationErrors);
    if (!valid) return;

    if (!minimoOk) {
      setErrorMessage(`El pedido mínimo es de ${minimoViandas} viandas. Te faltan ${faltan}.`);
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");
    try {
      const { pedidoId: id, numeroPedido: numero } = await submitOrder({
        cart,
        cliente,
        zonaEnvioId,
        costoEnvio,
        metodoPago: metodoSeleccionado.nombre,
        descuentoPorcentaje,
        descuentoCantidadPorcentaje,
      });
      setPedidoId(id);
      setNumeroPedido(numero);
      setStatus("success");
      clearCart();

      try {
        const emailParams = buildOrderEmailParams({
          cliente,
          items: cart,
          subtotal,
          descuentoCantidadPorcentaje,
          descuentoCantidadMonto,
          descuentoMetodoPagoMonto,
          descuentoMonto,
          descuentoPorcentaje,
          costoEnvio,
          total,
          metodoPagoElegido: metodoSeleccionado.nombre,
          numeroPedido: numero,
        });
        await sendOrderConfirmationEmail(emailParams);
      } catch (emailErr) {
        console.error("No se pudo enviar el mail de confirmación:", emailErr);
      }
    } catch (err) {
      const message = String(err?.message || "");
      if (message.startsWith("STOCK_INSUFICIENTE:")) {
        setErrorMessage(`Se acabó el stock de "${message.split(":")[1]}". Volvé al carrito para ajustar la cantidad.`);
      } else {
        setErrorMessage("No pudimos confirmar tu pedido. Revisá tu conexión e intentá de nuevo.");
      }
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className={styles.confirmacion}>
        <p className="sectionLabel">Pedido confirmado</p>
        <p className={styles.numeroPedido}>#{numeroPedido}</p>
        <p>Recibimos tu pedido. Te vamos a contactar para coordinar el pago y la entrega.</p>
        <Link href="/tienda" style={{ fontWeight: 600, textDecoration: "underline", display: "inline-block", marginTop: "1rem" }}>
          Volver a la tienda
        </Link>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className={styles.confirmacion}>
        <h1>Tu carrito está vacío</h1>
        <Link href="/tienda" style={{ fontWeight: 600, textDecoration: "underline" }}>
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.grid} onSubmit={handleSubmit}>
      <div>
        <div className={styles.field}>
          <label htmlFor="nombre">Nombre y apellido</label>
          <input id="nombre" value={cliente.nombre} onChange={handleChange("nombre")} />
          {errors.nombre && <p className={styles.error}>{errors.nombre}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="telefono">Teléfono</label>
          <input id="telefono" value={cliente.telefono} onChange={handleChange("telefono")} />
          {errors.telefono && <p className={styles.error}>{errors.telefono}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={cliente.email} onChange={handleChange("email")} />
          {errors.email && <p className={styles.error}>{errors.email}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="direccion">Dirección de entrega</label>
          <input id="direccion" value={cliente.direccion} onChange={handleChange("direccion")} />
          {errors.direccion && <p className={styles.error}>{errors.direccion}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="zona">Zona de envío</label>
          <select id="zona" value={zonaEnvioId} onChange={(e) => setZonaEnvioId(e.target.value)}>
            <option value="">Seleccioná una zona</option>
            {zonasActivas.map((zona) => (
              <option key={zona.id} value={zona.id}>
                {zona.nombre} — ${zona.costo}
              </option>
            ))}
          </select>
          {errors.zonaEnvioId && <p className={styles.error}>{errors.zonaEnvioId}</p>}
        </div>
        <div className={styles.field}>
          <label>Método de pago preferido</label>
          <div className={styles.metodoPago}>
            {metodosActivos.map((metodo) => (
              <label
                key={metodo.id}
                className={`${styles.metodoCard} ${metodoPagoId === metodo.id ? styles.metodoCardActivo : ""}`}
              >
                <input
                  type="radio"
                  name="metodoPago"
                  value={metodo.id}
                  checked={metodoPagoId === metodo.id}
                  onChange={(e) => setMetodoPagoId(e.target.value)}
                  className={styles.metodoRadio}
                />
                <span className={styles.metodoNombre}>{metodo.nombre}</span>
                {metodo.descuentoPorcentaje > 0 && (
                  <span className={styles.metodoDescuento}>-{metodo.descuentoPorcentaje}%</span>
                )}
              </label>
            ))}
          </div>
          {errors.metodoPago && <p className={styles.error}>{errors.metodoPago}</p>}
        </div>
      </div>

      <div className={styles.resumen}>
        <h2 style={{ marginBottom: "1rem" }}>Resumen</h2>
        {cart.map((item) => (
          <div key={`${item.productoId}::${(item.guarniciones || []).join("|")}`} className={styles.resumenRow}>
            <span>
              {item.cantidad}× {item.nombre}
              {(item.guarniciones || []).length > 0 ? ` (${item.guarniciones.join(", ")})` : ""}
            </span>
            <span>${item.precio * item.cantidad}</span>
          </div>
        ))}
        {descuentoCantidadMonto > 0 && (
          <div className={styles.resumenRow}>
            <span>Descuento por cantidad ({descuentoCantidadPorcentaje}%)</span>
            <span>-${descuentoCantidadMonto}</span>
          </div>
        )}
        {descuentoMetodoPagoMonto > 0 && (
          <div className={styles.resumenRow}>
            <span>Descuento método de pago ({metodoSeleccionado.nombre} -{descuentoPorcentaje}%)</span>
            <span>-${descuentoMetodoPagoMonto}</span>
          </div>
        )}
        <div className={styles.resumenRow}>
          <span>Envío</span>
          <span>{envioGratisAplica ? "Gratis" : `$${costoEnvio}`}</span>
        </div>
        <div className={`${styles.resumenRow} ${styles.resumenTotal}`}>
          <span>Total</span>
          <span>${total}</span>
        </div>
        {zonaSeleccionada && <RepartoInfo zona={zonaSeleccionada} />}
        <button type="submit" className={styles.confirmar} disabled={status === "submitting" || !minimoOk}>
          {status === "submitting" ? "Confirmando..." : minimoOk ? "Confirmar pedido" : `Faltan ${faltan} viandas`}
        </button>
        {status === "error" && <p className={styles.formError}>{errorMessage}</p>}
      </div>
    </form>
  );
}
