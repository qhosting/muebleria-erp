
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, CreditCard, ShieldCheck, Truck, ArrowRight, Star, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SolicitudCreditoModal from './SolicitudCreditoModal';

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precioVenta: number;
  imagenUrl: string | null;
}

export default function LandingPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculadora interactiva
  const [montoCompra, setMontoCompra] = useState(10000);
  const [plazoSemanas, setPlazoSemanas] = useState(48);

  // Modal solicitud de crédito
  const [creditoModalOpen, setCreditoModalOpen] = useState(false);
  const [productoInteres, setProductoInteres] = useState('');

  const pagoSemanal = Math.ceil(montoCompra / plazoSemanas);

  useEffect(() => {
    fetch('/api/tienda/productos')
      .then(res => res.json())
      .then(data => {
        setProductos(data.productos || []);
        setCategorias(data.categorias || []);
      })
      .catch(err => console.error('Error cargando productos:', err))
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(price);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">D</span>
              </div>
              <span className="text-2xl font-bold text-slate-900 tracking-tight">DOMIAHOME</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#productos" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Productos</a>
              <a href="#credito" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Crédito Directo</a>
              <a href="#contacto" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Contacto</a>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/consulta">
                <Button variant="ghost" className="text-blue-600 font-bold">Consultar Saldo</Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" className="text-slate-600">Acceso Personal</Button>
              </Link>
              <a href="#productos">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200">
                  Ver Catálogo
                </Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image 
            src="/furniture_ecommerce_hero.png"
            alt="Muebles de Lujo DomiaHome"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold mb-6">
              <Star className="w-4 h-4 fill-blue-600" />
              <span>Catálogo Disponible</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-extrabold text-slate-900 leading-tight mb-6">
              Rediseña tu Hogar con <span className="text-blue-600">Estilo Único.</span>
            </h1>
            <p className="text-xl text-slate-700 mb-10 leading-relaxed">
              Descubre colecciones exclusivas de muebles que combinan diseño moderno, 
              confort supremo y la mejor calidad artesanal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#productos">
                <Button size="lg" className="h-14 px-8 text-lg bg-slate-900 hover:bg-slate-800 text-white rounded-full">
                  Explorar Colección <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </a>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-14 px-8 text-lg border-2 rounded-full"
                onClick={() => { setProductoInteres(''); setCreditoModalOpen(true); }}
              >
                Solicitar Crédito
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Trust Bar */}
      <div className="bg-slate-50 py-12 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Truck className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Envío Gratis</h4>
                <p className="text-sm text-slate-500">En zonas locales</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                <CreditCard className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Crédito Fácil</h4>
                <p className="text-sm text-slate-500">Aprobación inmediata</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                <ShieldCheck className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Garantía Total</h4>
                <p className="text-sm text-slate-500">2 años de respaldo</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Star className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Calidad Premium</h4>
                <p className="text-sm text-slate-500">Más de 15 años</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Products Section — DATOS REALES */}
      <section id="productos" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Nuestro Catálogo</h2>
            <p className="text-slate-600 text-lg">
              {productos.length > 0
                ? `${productos.length} productos disponibles para ti.`
                : 'Cargando productos...'}
            </p>
          </div>
          {categorias.length > 0 && (
            <div className="hidden md:flex gap-2">
              {categorias.slice(0, 4).map(cat => (
                <span key={cat} className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-700">
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
            <p className="text-slate-500">Cargando catálogo...</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl">
            <Package className="w-16 h-16 text-slate-300 mb-6" />
            <h3 className="text-2xl font-bold text-slate-700 mb-2">Catálogo en preparación</h3>
            <p className="text-slate-500 max-w-md text-center">
              Estamos actualizando nuestro catálogo en línea. Contáctanos directamente para conocer los productos disponibles.
            </p>
            <a href="#credito">
              <Button className="mt-8 bg-blue-600 hover:bg-blue-700 text-white">
                Solicitar Información
              </Button>
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {productos.map((product) => (
              <div key={product.id} className="group cursor-pointer">
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden mb-6 bg-slate-100">
                  {product.imagenUrl ? (
                    <img 
                      src={product.imagenUrl} 
                      alt={product.nombre}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                      <Package className="w-16 h-16 text-slate-300 mb-3" />
                      <span className="text-xs text-slate-400 font-medium">{product.codigo}</span>
                    </div>
                  )}
                  {product.categoria && (
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-900">
                        {product.categoria}
                      </span>
                    </div>
                  )}
                  <button 
                    className="absolute bottom-6 right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl translate-y-20 group-hover:translate-y-0 transition-all duration-300"
                    onClick={() => {
                      setMontoCompra(product.precioVenta);
                      setProductoInteres(product.nombre);
                      setCreditoModalOpen(true);
                    }}
                  >
                    <CreditCard className="w-5 h-5 text-slate-900" />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{product.nombre}</h3>
                <p className="text-slate-500 font-medium">{formatPrice(product.precioVenta)}</p>
                {product.descripcion && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{product.descripcion}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Credit Section — CALCULADORA FUNCIONAL */}
      <section id="credito" className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-5">
          <CreditCard className="w-full h-full -rotate-12" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl font-bold mb-8">Amuebla Hoy, <br /><span className="text-blue-400">Paga Después.</span></h2>
              <p className="text-xl text-slate-300 mb-12">
                Con nuestro crédito directo, no necesitas tarjetas bancarias. 
                Aprobamos tu solicitud en menos de 24 horas para que disfrutes tu hogar ahora mismo.
              </p>
              <ul className="space-y-4 mb-12">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <span>Pagos semanales o quincenales</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <span>Sin penalización por liquidación anticipada</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <span>Requisitos mínimos: INE y comprobante de domicilio</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
                    <CreditCard className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Calculadora de Pagos</h3>
                    <p className="text-slate-400 text-sm">Calcula tu pago semanal</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">Monto de la compra</label>
                    <Input
                      type="number"
                      min={1000}
                      max={100000}
                      step={500}
                      value={montoCompra}
                      onChange={(e) => setMontoCompra(Number(e.target.value) || 0)}
                      className="bg-white/10 border-white/20 text-white text-2xl font-bold h-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">Plazo en semanas: {plazoSemanas}</label>
                    <input
                      type="range"
                      min={12}
                      max={96}
                      step={4}
                      value={plazoSemanas}
                      onChange={(e) => setPlazoSemanas(Number(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>12 sem</span>
                      <span>48 sem</span>
                      <span>96 sem</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Pago Semanal</p>
                      <p className="text-2xl font-bold text-blue-400">{formatPrice(pagoSemanal)}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Plazo</p>
                      <p className="text-2xl font-bold">{plazoSemanas} semanas</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 text-center mb-4">
                    * Estimación de referencia. Sujeto a aprobación crediticia.
                  </p>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-bold rounded-xl"
                    onClick={() => { setProductoInteres(''); setCreditoModalOpen(true); }}
                  >
                    Solicitar Crédito Ahora
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contacto" className="bg-slate-50 py-20 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">D</span>
                </div>
                <span className="text-xl font-bold text-slate-900 tracking-tight">DOMIAHOME</span>
              </div>
              <p className="text-slate-500 max-w-sm leading-relaxed">
                Transformando hogares con elegancia y accesibilidad desde hace más de 15 años. 
                Calidad garantizada y crédito directo para todas las familias.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Enlaces Rápidos</h4>
              <ul className="space-y-4 text-slate-600">
                <li><a href="#productos" className="hover:text-blue-600 transition-colors">Ver Productos</a></li>
                <li><a href="#credito" className="hover:text-blue-600 transition-colors">Solicitar Crédito</a></li>
                <li><Link href="/consulta" className="text-blue-600 font-bold hover:underline">Consultar Mi Saldo (WhatsApp)</Link></li>
                <li><Link href="/login" className="hover:text-blue-600 transition-colors">Portal Empleados</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Contacto</h4>
              <ul className="space-y-4 text-slate-600 text-sm">
                <li>📍 Av. Principal #123, Col. Centro</li>
                <li>📞 800-MUEBLES (683-2537)</li>
                <li>✉️ hola@domiahome.com</li>
              </ul>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t text-center text-slate-400 text-sm">
            <p>&copy; {new Date().getFullYear()} DOMIAHOME. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
      {/* Modal de Solicitud de Crédito */}
      <SolicitudCreditoModal
        open={creditoModalOpen}
        onClose={() => setCreditoModalOpen(false)}
        montoSugerido={montoCompra}
        productoInteres={productoInteres}
      />
    </div>
  );
}
