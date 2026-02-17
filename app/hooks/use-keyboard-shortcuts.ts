
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

const shortcuts: KeyboardShortcut[] = [
  {
    key: 'd',
    ctrl: true,
    description: 'Ir al Dashboard',
    action: () => {}
  },
  {
    key: 'c',
    ctrl: true,
    description: 'Ir a Clientes',
    action: () => {}
  },
  {
    key: 'p',
    ctrl: true,
    description: 'Ir a Pagos',
    action: () => {}
  },
  {
    key: 'r',
    ctrl: true,
    description: 'Ir a Reportes',
    action: () => {}
  },
  {
    key: '?',
    shift: true,
    description: 'Mostrar ayuda de atajos',
    action: () => {}
  }
];

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si está escribiendo en un input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl + D: Dashboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        router.push('/dashboard');
      }

      // Ctrl + C: Clientes
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        router.push('/dashboard/clientes');
      }

      // Ctrl + P: Pagos
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        router.push('/dashboard/pagos');
      }

      // Ctrl + R: Reportes
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        router.push('/dashboard/reportes');
      }

      // Shift + ?: Ayuda
      if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        mostrarAyuda();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const mostrarAyuda = () => {
    const mensaje = `
🔥 Atajos de Teclado:

Ctrl + K: Búsqueda global
Ctrl + D: Dashboard
Ctrl + C: Clientes
Ctrl + P: Pagos
Ctrl + R: Reportes
Shift + ?: Esta ayuda
    `;
    toast(mensaje, { duration: 5000 });
  };

  return { mostrarAyuda };
}
