// Copyright (c) 2019-present Ladifire, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from "react";
import classNames from "classnames";
import KeyController from "keycon";
import { ref } from "framework-utils";
import { Frame, setAlias } from "scenejs";

import ReactDragSelectable from "../full-drag-select";
import MoveAble, { OnRotateStart } from "react-moveable";
import Guides from "../guides";
import {
  MoveableManagerProps,
  OnDrag,
  OnDragGroupEnd,
  OnDragGroupStart,
  OnDragStart,
  OnResize,
  OnResizeGroup,
  OnResizeGroupStart,
  OnResizeStart,
  OnRotate,
  OnRotateGroup,
  OnRotateGroupEnd,
  OnRotateGroupStart,
  OnRender,
  OnRenderGroup,
  OnClick,
  OnClickGroup
} from "react-moveable";

import { ArtBoardContentType, Targets } from "./type";
import BaseElement from "../elements/base-elements";
import { ElementType } from "../elements/base-elements/type";

import "./style.scss";
import "../elements/base-elements/style.scss";

setAlias("tx", ["transform", "translateX"]);
setAlias("ty", ["transform", "translateY"]);
setAlias("tz", ["transform", "translateZ"]);
setAlias("rotate", ["transform", "rotate"]);
setAlias("sx", ["transform", "scaleX"]);
setAlias("sy", ["transform", "scaleY"]);
setAlias("matrix3d", ["transform", "matrix3d"]);

type ArtBoardProps = {
  /** Desktop, tablet or mobile view */
  viewMode: string;
  scale: number;
};

type TranslateType = number[];

type ArtBoardState = {
  hasElementResizing?: boolean;
  frame: {
    translate: TranslateType;
    rotate: number;
  };
  target?: any;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  rKey?: boolean;
  verticalGuidelines?: number[];
  horizontalGuidelines?: number[];
  showRuler?: boolean;
  selectables: {
    [id: string]: HTMLElement | SVGAElement | null;
  };
  visibleElements?: Array<HTMLElement | SVGAElement>;
  lastSelectElement: {
    time?: number;
    element?: HTMLElement | SVGAElement | undefined | null;
  };
};

export default class ArtBoard extends React.PureComponent<
  ArtBoardProps,
  ArtBoardState
> {
  static defaultProps: ArtBoardProps = {
    viewMode: "desktop",
    scale: 1
  };

  state: ArtBoardState = {
    hasElementResizing: false,
    frame: {
      translate: [0, 0, 0],
      rotate: 0
    },
    showRuler: false,
    selectables: {},
    lastSelectElement: {
      time: 0,
      element: null
    }
  };

  /** MoveAble tooltip */
  private tooltip: HTMLElement | undefined;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  callback: Function = (selection: any, event: any) => {};
  private moveable: MoveableManagerProps<any>;
  private frameMap = new Map();

  private guides1: Guides | null = null;
  private guides2: Guides | null = null;
  private handleRenderGroup: any = ({ targets }: OnRenderGroup) => {
    targets.forEach(target => this.handleRender({ target }));
  };

  /**
   * Create new frame and assign it to frameMap*/
  newFrame = (el: HTMLElement | SVGAElement) => {
    const frame = new Frame({
      transform: {
        translateX: "0px",
        translateY: "0px",
        rotate: "0deg",
        scaleX: 1,
        scaleY: 1
      }
    });

    this.frameMap.set(el, frame);

    return frame;
  };

  getFrame = (target: HTMLElement | SVGAElement) => {
    return this.frameMap.get(target) || this.newFrame(target);
  };

  private handleRender: any = ({ target }: OnRender) => {
    // const {frame} = this.state;
    // target.style.transform = `translate(${frame.translate[0]}px, ${
    //     frame.translate[1]
    // }px) rotate(${frame.rotate}deg)`;

    target.style.cssText += this.getFrame(target as
      | HTMLElement
      | SVGAElement).toCSS();
  };

  private dragSelector: any;
  private handleDragSelectRef: any = (r: any) => {
    this.dragSelector = r;
  };

  private handleChildMounted: any = (
    id: string,
    element: HTMLElement | SVGAElement | null
  ) => {
    if (!this.state.selectables[id]) {
      setTimeout(() => {
        this.setState({
          selectables: {
            ...this.state.selectables,
            [id]: element
          }
        });
      });
    }
  };
  private handleChildUnmounted: any = (
    id: string,
    element: HTMLElement | SVGAElement | null
  ) => {};
  private handleVisibleElementsChange: any = (
    visibleElements: Array<HTMLElement | SVGAElement>
  ) => {
    this.setState({ visibleElements });
  };

  componentDidMount(): void {
    this.tooltip = this.createTooltip();

    // setup guides
    window.addEventListener("resize", () => {
      if (this.guides1) {
        this.guides1.resize();
      }

      if (this.guides2) {
        this.guides2.resize();
      }
    });

    const keycon = new KeyController(window);
    keycon.keydown(["ctrl", "a"], event => {
      console.log("ctrl + A", event);
    });

    keycon
      .keydown("shift", () => {
        this.setState({ shiftKey: true });
      })
      .keyup("shift", () => {
        this.setState({ shiftKey: false });
      });

    keycon
      .keydown("ctrl", () => {
        this.setState({ ctrlKey: true });
      })
      .keyup("ctrl", () => {
        this.setState({ ctrlKey: false });
      });

    keycon
      .keydown("r", () => {
        if (!this.state.rKey) {
          console.log("r key press");
          this.setState({ rKey: true });
        }
      })
      .keyup("r", () => {
        if (this.state.rKey) {
          console.log("r key up");
          this.setState({ rKey: false });
        }
      });
  }


  handleSelectChange = (
    newTarget?: HTMLElement | SVGAElement | undefined | null,
    event?: MouseEvent
  ) => {
    this.setState({
      lastSelectElement: {
        time: new Date().getTime(),
        element: newTarget
      }
    });
    let nextState: Targets = this.state.target || [];
    if (newTarget) {
      const index = nextState.indexOf(newTarget);
      if (index === -1) {
        if (this.state.ctrlKey) {
          nextState = [...nextState, newTarget];
        } else {
          nextState = [newTarget];
        }
      } else if (this.state.ctrlKey) {
        nextState.splice(index, 1);
        nextState = nextState.slice();
      }
    } else {
      nextState = [];
    }

    this.onTargetChange(nextState, () => {
      this.moveable.dragStart(event);
    });
  };

  handleMultipleSelectChange = (
    elements: Array<HTMLElement | SVGAElement>,
    event: MouseEvent
  ) => {
    this.onTargetChange(elements, () => {});
  };

  private onTargetChange: any = (newTarget: any, callback?: Function) => {
    this.setState(
      {
        target: newTarget
      },
      () => {
        if (typeof callback === "function") {
          callback();
        }
      }
    );
  };

  private handleElementClick: any = () => {};

  private handleGroupClick: any = ({
    inputEvent,
    inputTarget,
    targets,
    target,
    isTarget,
    targetIndex
  }: OnClickGroup) => {
    if (!inputTarget.classList.contains("element__wrapper")) {
      return;
    }

    const index = targets.indexOf(inputTarget);
    let nextTargets = targets.slice();

    if (this.state.ctrlKey) {
      if (index === -1) {
        nextTargets = nextTargets.concat(inputTarget);
      } else {
        nextTargets.splice(index, 1);
      }
    } else {
      nextTargets = [inputTarget];
    }

    this.onTargetChange(nextTargets, () => {
      this.moveable.updateRect();
    });

    // this.setState({
    //     target: nextTargets,
    // }, () => {
    //     this.moveable.updateRect();
    // });
  };
  private handleDragGroupStart: any = ({ events }: OnDragGroupStart) => {
    this.lockSelector();

    events.forEach(this.handleDragStart);
  };
  private handleDragGroup: any = ({ events }: OnDragGroupStart) => {
    events.forEach(this.handleDrag);
  };
  private handleDragGroupEnd: any = ({
    targets,
    isDrag,
    clientX,
    clientY
  }: OnDragGroupEnd) => {
    this.unLockSelector();
    this.hideTooltip();
  };
  private handleResizeGroupStart: any = ({
    targets,
    events
  }: OnResizeGroupStart) => {
    this.lockSelector();
    events.forEach(this.handleResizeStart);
  };
  private handleResizeGroup: any = ({ targets, events }: OnResizeGroup) => {
    events.forEach(this.handleResize);
  };
  private handleResizeGroupEnd: any = () => {
    this.unLockSelector();
    this.hideTooltip();
  };

  handleArtBoardRef = (r: HTMLDivElement) => {
    this.artBoard = r;
  };
  artBoard: HTMLElement | null = null;

  createTooltip = () => {
    const tooltip = document.createElement("div");

    tooltip.id = "lf-m-tooltip";
    tooltip.className = "lf__tooltip";
    tooltip.style.display = "none";
    const area = this.artBoard;
    if (area) {
      area.appendChild(tooltip);
    }

    return tooltip;
  };

  setTooltipContent = (clientX: number, clientY: number, text: string) => {
    if (this.tooltip) {
      let scale = this.state.target && this.state.target.length > 1 ? 1 : this.props.scale
      this.tooltip.style.cssText = `display: block; transform: translate(${clientX / scale +
        50}px, ${clientY / scale - 10}px) translate(-100%, -100%);`;
      this.tooltip.innerHTML = text;
    }
  };

  hideTooltip = () => {
    if (this.tooltip) {
      this.tooltip.style.display = "none";
    }
  };

  lockSelector = () => {
    this.setState({ hasElementResizing: true });
  };

  unLockSelector = () => {
    this.setState({ hasElementResizing: false });
  };

  private handleDragStart: any = ({ target, set }: OnDragStart) => {
    this.lockSelector();
    const frame = this.getFrame(target as HTMLElement | SVGAElement);
    set([
      parseFloat(frame.get("transform", "translateX")),
      parseFloat(frame.get("transform", "translateY"))
    ]);
  };

  private handleDrag: any = ({
    target,
    beforeTranslate,
    translate,
    delta,
    left,
    top,
    clientX,
    clientY,
    isPinch
  }: OnDrag) => {
    const frame = this.getFrame(target as HTMLElement | SVGAElement);
    if (this.state.shiftKey) {
      if (delta[0] !== 0) {
        frame.set("transform", "translateX", `${beforeTranslate[0]}px`);
      } else if (delta[1] !== 0) {
        frame.set("transform", "translateY", `${beforeTranslate[1]}px`);
      }
    } else {
      frame.set("transform", "translateX", `${beforeTranslate[0]}px`);
      frame.set("transform", "translateY", `${beforeTranslate[1]}px`);
    }

    if (!isPinch) {
      this.setTooltipContent(
        clientX,
        clientY,
        `X: ${Math.round(left)}px<br/>Y: ${Math.round(top)}px`
      );
    }
  };

  private handleDragEnd: any = () => {
    this.unLockSelector();
    this.hideTooltip();
  };

  private handleResizeStart: any = ({
    target,
    setOrigin,
    dragStart
  }: OnResizeStart) => {
    this.lockSelector();
    setOrigin(["%", "%"]);
    const frame = this.getFrame(target as HTMLElement | SVGAElement);
    if (dragStart) {
      dragStart.set([parseFloat(frame.get("tx")), parseFloat(frame.get("ty"))]);
    }
  };

  private handleResize: any = ({
    target,
    width,
    height,
    drag,
    clientX,
    clientY,
    isPinch
  }: OnResize) => {
    const frame = this.getFrame(target as HTMLElement | SVGAElement);
    frame.set("width", `${width}px`);
    frame.set("height", `${height}px`);
    frame.set("tx", `${drag.beforeTranslate[0]}px`);
    frame.set("ty", `${drag.beforeTranslate[1]}px`);

    // target.style.cssText += frame.toCSS();

    if (!isPinch) {
      this.setTooltipContent(
        clientX,
        clientY,
        `W: ${width.toFixed(0)}px<br/>H: ${height.toFixed(0)}px`
      );
    }
  };

  private handleResizeEnd: any = () => {
    this.unLockSelector();
    this.hideTooltip();
  };

  private handleRotateStart: any = ({ target, set }: OnRotateStart) => {
    this.lockSelector();

    const frame = this.getFrame(target as HTMLElement | SVGAElement);
    set(parseFloat(frame.get("transform", "rotate")));
  };

  private handleRotate: any = ({
    target,
    beforeRotate,
    clientX,
    clientY,
    isPinch,
    beforeDelta
  }: OnRotate) => {

    const frame = this.getFrame(target as HTMLElement | SVGAElement);
    const deg = parseFloat(frame.get("transform", "rotate")) + beforeDelta;
    if (!isPinch) {
        this.setTooltipContent(clientX, clientY, `R: ${deg.toFixed(1)}`);
    }
    frame.set("transform", "rotate", `${deg}deg`);
    target.style.cssText += frame.toCSS();
    this.moveable.updateRect();
  };

  private handleRotateEnd: any = () => {
    this.unLockSelector();
    this.hideTooltip();
  };

  private handleRotateGroupStart: any = ({
    targets,
    events
  }: OnRotateGroupStart) => {
    this.lockSelector();
    events.forEach(({ target, set, dragStart }) => {
      const frame = this.getFrame(target as HTMLElement | SVGAElement);
      const tx = parseFloat(frame.get("transform", "translateX")) || 0;
      const ty = parseFloat(frame.get("transform", "translateY")) || 0;
      const rotate = parseFloat(frame.get("transform", "rotate")) || 0;

      set(rotate);

      if (dragStart) {
        dragStart.set([tx, ty]);
      }
    });

    // events.forEach(this.handleRotateStart);
  };
  private handleRotateGroup: any = ({
    targets,
    events,
    set
  }: OnRotateGroup) => {
    // events.forEach(this.handleRotate);
    events.forEach(({ target, beforeRotate, drag }) => {
      const frame = this.getFrame(target as HTMLElement | SVGAElement);
      const beforeTranslate = drag.beforeTranslate;

      frame.set("transform", "rotate", `${beforeRotate}deg`);
      frame.set("transform", "translateX", `${beforeTranslate[0]}px`);
      frame.set("transform", "translateY", `${beforeTranslate[1]}px`);
      target.style.cssText += frame.toCSS();
    });
  };
  private handleRotateGroupEnd: any = ({
    targets,
    isDrag
  }: OnRotateGroupEnd) => {
    this.unLockSelector();
  };

  renderMoveable = () => {
    const { horizontalGuidelines, verticalGuidelines } = this.state;

    return (
      <MoveAble
        ref={ref(this, "moveable")}
        rootContainer={document.body}

        // edge={true}
        target={this.state.target}
        draggable={true}
        snappable={true}
        snapCenter={true}
        throttleDrag={0}
        origin={false}
        resizable={true}
        throttleResize={0}
        rotatable={true}
        rotationAtCorner={false}
        scrollable={true}
        scrollContainer={document.documentElement}
        scrollThreshold={1}
        keepRatio={this.state.shiftKey}
        throttleRotate={this.state.shiftKey ? 30 : 0}
        onRender={this.handleRender}
        onRenderGroup={this.handleRenderGroup}
        elementGuidelines={this.state.visibleElements}
        verticalGuidelines={verticalGuidelines}
        horizontalGuidelines={horizontalGuidelines}
        onDragStart={this.handleDragStart}
        onDrag={this.handleDrag}
        onDragEnd={this.handleDragEnd}
        onRotateStart={this.handleRotateStart}
        onRotate={this.handleRotate}
        onRotateEnd={this.handleRotateEnd}
        onResizeStart={this.handleResizeStart}
        onResize={this.handleResize}
        onResizeEnd={this.handleResizeEnd}
        onResizeGroupStart={this.handleResizeGroupStart}
        onResizeGroup={this.handleResizeGroup}
        onResizeGroupEnd={this.handleResizeGroupEnd}
        onClick={this.handleElementClick}
        onClickGroup={this.handleGroupClick}
        onDragGroupStart={this.handleDragGroupStart}
        onDragGroup={this.handleDragGroup}
        onDragGroupEnd={this.handleDragGroupEnd}
        onRotateGroupStart={this.handleRotateGroupStart}
        onRotateGroup={this.handleRotateGroup}
        onRotateGroupEnd={this.handleRotateGroupEnd}
      />
    );
  };

  renderGuides = () => {
    return (
      <React.Fragment>
        <div className="box" />
        <div className={classNames("ruler", "horizontal")}>
          <Guides
            ref={ref(this, "guides1")}
            type="horizontal"
            rulerStyle={{
              left: "20px",
              width: "calc(100% - 20px)",
              height: "100%"
            }}
            setGuides={guides => {
              this.setState({ horizontalGuidelines: guides.map(g => g + 20) });
            }}
          />
        </div>
        <div className={classNames("ruler", "vertical")}>
          <Guides
            ref={ref(this, "guides2")}
            type="vertical"
            rulerStyle={{
              top: "0",
              height: "100%",
              width: "100%"
            }}
            setGuides={guides => {
              this.setState({ verticalGuidelines: guides.map(g => g + 20) });
            }}
          />
        </div>
      </React.Fragment>
    );
  };

  renderDemo = () => {
    const demoElements = [];
    let index = 0;
    for (let column = 0; column < 4; column++) {
      for (let i = 0; i < 5; i++) {
        index++;
        demoElements.push(
          <BaseElement
            key={`column__${column}_element__${i}`}
            style={{
              top: i * 150 + 150,
              left: column * 150 + 60,
              backgroundColor: "#aaa",
              padding: 10
            }}
            onMounted={this.handleChildMounted}
            onUnmounted={this.handleChildUnmounted}
          >
            <div>{`test__${index}`}</div>
          </BaseElement>
        );
      }
    }

    return demoElements;
  };

  renderContent = () => {
    const { viewMode } = this.props;

    return (
      <div className={classNames("art_board_area", `art_board__${viewMode}`)}>
        {this.renderDemo()}
      </div>
    );
  };

  render() {
    const { showRuler } = this.state;
    return (
      <React.Fragment>
        <div
          ref={this.handleArtBoardRef}
          className={classNames("art_board_wrapper", {
            art_board__loading: false,
            show__ruler: showRuler
          })}
        >
          {this.renderContent()}
          {this.renderMoveable()}
        </div>
        {showRuler && this.renderGuides()}
        <ReactDragSelectable
          ref={this.handleDragSelectRef}
          scale={this.props.scale}
          container={this.artBoard}
          observerAbleClass="element__wrapper"
          selectAbleClass="element__selectable"
          onSelectChange={this.handleSelectChange}
          onMultipleSelectChange={this.handleMultipleSelectChange}
          locked={this.state.hasElementResizing}
          selectables={this.state.selectables}
          onVisibleElementsChange={this.handleVisibleElementsChange}
        />
      </React.Fragment>
    );
  }
}
